import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminDashboard } from './admin-dashboard';
import { AuthService } from '../../../core/services/auth.service';
import { TradingService } from '../../../core/services/trading.service';
import { ApiService } from '../../../core/services/api.service';
import { Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { vi } from 'vitest';
import { Holding } from '../../../core/models/trading.models';

class AdminAllocationHarness extends AdminDashboard {
  readonly allocation = this.analyticsData;
}

describe('AdminDashboard session tabs', () => {
  const key = 'admin-client-tabs:admin-1';
  const clients = [
    { id: 'client-1', name: 'First client', email: 'first@example.com' },
    { id: 'client-2', name: 'Second client', email: 'second@example.com' },
  ];
  const getHoldings = vi.fn();
  const getOrders = vi.fn();
  const signOut = vi.fn();
  let adminId: string;

  const create = () => TestBed.runInInjectionContext(() => new AdminDashboard());

  beforeEach(() => {
    sessionStorage.removeItem(key);
    sessionStorage.removeItem('admin-client-tabs:admin-2');
    adminId = 'admin-1';
    getHoldings.mockReset().mockReturnValue(of([]));
    getOrders.mockReset().mockReturnValue(of([]));
    signOut.mockReset();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { user: () => ({ id: adminId }), signOut } },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: TradingService, useValue: {
          getClientByEmail: (email: string) => of(clients.find(client => client.email === email)!),
          getHoldings, getOrders,
        } },
      ],
    });
  });

  afterEach(() => {
    sessionStorage.removeItem(key);
    sessionStorage.removeItem('admin-client-tabs:admin-2');
    vi.restoreAllMocks();
  });

  it('restores open tabs and selection and fetches fresh client data after refresh', () => {
    const original = create();
    for (const client of clients) {
      original.searchQuery.set(client.email);
      original.searchClient();
    }
    original.setClient('client-1');
    original.setTab('orders');
    getHoldings.mockClear();
    getOrders.mockClear();

    const restored = create();
    restored.ngOnInit();
    expect(restored.clients()).toEqual(clients);
    expect(restored.selectedAccountId()).toBe('client-1');
    expect(restored.selectedAccount()).toEqual(clients[0]);
    expect(restored.activeTab()).toBe('orders');
    expect(getHoldings).toHaveBeenCalledExactlyOnceWith('client-1', true);
    expect(getOrders).toHaveBeenCalledExactlyOnceWith('client-1');
    const stored = JSON.parse(sessionStorage.getItem(key)!);
    expect(Object.keys(stored).sort()).toEqual(['activeTab', 'clients', 'selectedAccountId']);
  });

  it('does not restore another admin account tabs', () => {
    const original = create();
    original.searchQuery.set(clients[0].email);
    original.searchClient();
    adminId = 'admin-2';
    const restored = create();
    restored.ngOnInit();
    expect(restored.clients()).toEqual([]);
    expect(restored.selectedAccountId()).toBeNull();
  });

  it('closes an unselected tab without reloading the selected client and persists it', () => {
    const component = create();
    for (const client of clients) {
      component.searchQuery.set(client.email);
      component.searchClient();
    }
    getHoldings.mockClear();
    component.closeClient('client-1');
    expect(component.clients()).toEqual([clients[1]]);
    expect(component.selectedAccountId()).toBe('client-2');
    expect(getHoldings).not.toHaveBeenCalled();
    const restored = create();
    restored.ngOnInit();
    expect(restored.clients()).toEqual([clients[1]]);
  });

  it('selects a neighboring client when closing the active tab', () => {
    const component = create();
    for (const client of clients) {
      component.searchQuery.set(client.email);
      component.searchClient();
    }
    component.closeClient('client-2');
    expect(component.selectedAccountId()).toBe('client-1');
    expect(component.clients()).toEqual([clients[0]]);
    expect(getHoldings).toHaveBeenLastCalledWith('client-1', true);
  });

  it('clears the last tab and ignores its late data response', () => {
    const pending = new Subject<Holding[]>();
    getHoldings.mockReturnValue(pending);
    const component = create();
    component.searchQuery.set(clients[0].email);
    component.searchClient();
    component.closeClient('client-1');
    pending.next([{
      clientId: 'client-1', symbol: 'USD', instrument: 'CASH',
      quantity: '100', avgBuyPrice: '1', currentValue: '100',
    }]);
    pending.complete();
    expect(component.clients()).toEqual([]);
    expect(component.selectedAccount()).toBeNull();
    expect(component.selectedAccountId()).toBeNull();
    expect(component.holdings()).toEqual([]);
    expect(component.orders()).toEqual([]);
    expect(component.loadingClientData()).toBe(false);
    expect(sessionStorage.getItem(key)).toBeNull();
  });

  it('clears saved tabs on logout', () => {
    const component = create();
    component.searchQuery.set(clients[0].email);
    component.searchClient();
    component.logout();
    expect(sessionStorage.getItem(key)).toBeNull();
    expect(signOut).toHaveBeenCalledOnce();
  });

  it.each(['{invalid', '{"clients":[{}],"selectedAccountId":"client-1","activeTab":"orders"}'])(
    'reports invalid stored tabs without preventing dashboard use',
    saved => {
      sessionStorage.setItem(key, saved);
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      const component = create();
      component.ngOnInit();
      expect(component.clients()).toEqual([]);
      expect(log).toHaveBeenCalledWith('Unable to restore admin client tabs:', expect.any(Error));
      component.searchQuery.set(clients[0].email);
      component.searchClient();
      expect(component.selectedAccountId()).toBe('client-1');
    },
  );

  it('keeps client selection working when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage blocked', 'SecurityError');
    });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const component = create();
    component.searchQuery.set(clients[0].email);
    component.searchClient();
    expect(component.selectedAccountId()).toBe('client-1');
    expect(getHoldings).toHaveBeenCalledWith('client-1', true);
    expect(log).toHaveBeenCalledWith('Unable to save admin client tabs:', expect.any(DOMException));
  });
});

describe('AdminDashboard instrument allocation', () => {
  let component: AdminAllocationHarness;
  const holdings: Holding[] = [
    { clientId: 'client-1', symbol: 'AAPL', instrument: 'EQUITY', quantity: '1', avgBuyPrice: '100', currentValue: '100' },
    { clientId: 'client-1', symbol: 'MSFT', quantity: '1', avgBuyPrice: '200', currentValue: '200' },
    { clientId: 'client-1', symbol: 'X:BTC-USD', instrument: 'crypto', quantity: '1', avgBuyPrice: '300', currentValue: '300' },
    { clientId: 'client-1', symbol: 'X:ETH-USD', instrument: 'CRYPTO', quantity: '1', avgBuyPrice: '100', currentValue: '100' },
    { clientId: 'client-1', symbol: 'EUR', instrument: 'CASH', quantity: '1', avgBuyPrice: '50', currentValue: '50' },
    { clientId: 'client-1', symbol: 'GBP', instrument: 'CASH', quantity: '1', avgBuyPrice: '25', currentValue: '25' },
    { clientId: 'client-1', symbol: ' usd ', instrument: 'cash', quantity: '125', avgBuyPrice: '1', currentValue: '125' },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { user: () => null } },
        { provide: Router, useValue: {} },
        TradingService,
        { provide: ApiService, useValue: {
          getClientByEmail: () => of({ id: 'client-1', name: 'Client', email: 'client@example.com' }),
          getHoldings: () => of(holdings),
          getOrders: () => of([]),
        } },
      ],
    });
    component = TestBed.runInInjectionContext(() => new AdminAllocationHarness());
  });

  it('groups loaded holdings by instrument using values rather than stock percentages', () => {
    component.searchQuery.set('client@example.com');
    component.searchClient();

    expect(component.allocation()).toEqual([
      { label: 'Equities', value: 300 },
      { label: 'Crypto', value: 400 },
      { label: 'Forex', value: 75 },
      { label: 'Cash', value: 125 },
    ]);
    expect(component.allocation().reduce((sum, item) => sum + item.value, 0)).toBe(component.portfolioValue());
    expect(component.portfolioHoldings()).toHaveLength(7);
    expect(component.portfolioValue()).toBe(900);
  });

  it('keeps the same categories with zero values for an empty portfolio', () => {
    expect(component.allocation()).toEqual([
      { label: 'Equities', value: 0 },
      { label: 'Crypto', value: 0 },
      { label: 'Forex', value: 0 },
      { label: 'Cash', value: 0 },
    ]);
  });

  it('preserves USD filtering for other holdings callers', () => {
    TestBed.inject(TradingService).getHoldings('client-1').subscribe(rows => {
      expect(rows).toHaveLength(6);
      expect(rows.some(row => row.symbol.trim().toUpperCase() === 'USD')).toBe(false);
    });
  });
});

describe('AdminDashboard', () => {
  let component: AdminDashboard;
  let fixture: ComponentFixture<AdminDashboard>;

  beforeEach(async () => {
    const clients = [
      { id: 'client-xxxx', name: 'Alex Morgan', email: 'alex.morgan@example.com' },
      { id: 'client-yyyy', name: 'Jordan Lee', email: 'jordan.lee@example.com' },
      { id: 'client-zzzz', name: 'Taylor Smith', email: 'taylor.smith@example.com' },
    ];
    const holdings = [
      { clientId: 'client-yyyy', symbol: 'AMZN', name: 'Amazon.com Inc.', quantity: '5', avgBuyPrice: '3000', currentValue: '891.05' },
      { clientId: 'client-yyyy', symbol: 'NVDA', name: 'NVIDIA Corp.', quantity: '8', avgBuyPrice: '100', currentValue: '971.2' },
      { clientId: 'client-zzzz', symbol: 'TSLA', name: 'Tesla Inc.', quantity: '4', avgBuyPrice: '200', currentValue: '955.6' },
    ];
    const orders = [
      { id: 'order-amzn', clientId: 'client-yyyy', symbol: 'AMZN', quantity: 3, orderType: 'BUY', status: 'ACCEPTED', executedAt: '2024-01-25T00:00:00Z', price: 3200 },
      { id: 'order-tsla', clientId: 'client-xxxx', symbol: 'TSLA', quantity: 2, orderType: 'SELL', status: 'ACCEPTED', executedAt: '2024-01-20T00:00:00Z', price: 238.9 },
      { id: 'order-aapl', clientId: 'client-xxxx', symbol: 'AAPL', quantity: 10, orderType: 'BUY', status: 'ACCEPTED', executedAt: '2024-01-15T00:00:00Z', price: 190.5 },
    ];
    const trading = {
      getClientByEmail: (email: string) => of(clients.find(client => client.email === email)!),
      getHoldings: (id: string) => of(holdings.filter(holding => holding.clientId === id)),
      getOrders: (id: string) => of(orders.filter(order => order.clientId === id)),
    };

    await TestBed.configureTestingModule({
      imports: [AdminDashboard],
      providers: [
        { provide: AuthService, useValue: { profile: () => null, user: () => null, signOut: () => Promise.resolve() } },
        { provide: Router, useValue: { navigate: () => Promise.resolve() } },
        { provide: TradingService, useValue: trading },
        { provide: ApiService, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts with no client selected and portfolio tab active', () => {
    expect(component.selectedAccountId()).toBeNull();
    expect(component.activeTab()).toBe('portfolio');
  });

  it('changes the selected client without changing the dashboard section', () => {
    component.searchQuery.set('alex.morgan@example.com');
    component.searchClient();
    component.setTab('orders');
    component.setClient('client-yyyy');

    expect(component.selectedAccountId()).toBe('client-yyyy');
    expect(component.selectedAccount()?.name).toBe('Jordan Lee');
    expect(component.activeTab()).toBe('orders');
  });

  it('shows only the selected client portfolio holdings', () => {
    component.searchQuery.set('alex.morgan@example.com');
    component.searchClient();
    component.setClient('client-yyyy');

    expect(component.portfolioHoldings().map(holding => holding.symbol)).toEqual(['AMZN', 'NVDA']);

    component.setClient('client-zzzz');

    expect(component.portfolioHoldings().map(holding => holding.symbol)).toEqual(['TSLA']);
  });

  it('shows only the selected client orders', () => {
    component.searchQuery.set('alex.morgan@example.com');
    component.searchClient();
    component.setClient('client-yyyy');

    expect(component.orderHistory().map(order => order.symbol)).toEqual(['AMZN']);

    component.setClient('client-xxxx');

    expect(component.orderHistory().map(order => order.symbol)).toEqual(['TSLA', 'AAPL']);
  });

  it('adds a searched client to the tabs and selects it', () => {
    component.searchQuery.set('jordan.lee@example.com');
    component.searchClient();

    expect(component.selectedAccountId()).toBe('client-yyyy');
    expect(component.selectedAccount()?.email).toBe('jordan.lee@example.com');
    expect(component.clients().map(client => client.id)).toEqual(['client-yyyy']);
  });

  it('keeps multiple email-search results in the client tabs', () => {
    component.searchQuery.set('alex.morgan@example.com');
    component.searchClient();
    component.searchQuery.set('jordan.lee@example.com');
    component.searchClient();

    expect(component.clients().map(client => client.id)).toEqual(['client-xxxx', 'client-yyyy']);
    expect(component.clients().map(client => client.email)).toEqual([
      'alex.morgan@example.com',
      'jordan.lee@example.com',
    ]);
    expect(component.selectedAccountId()).toBe('client-yyyy');
  });
});
