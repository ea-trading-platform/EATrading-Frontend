import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminDashboard } from './admin-dashboard';
import { AuthService } from '../../../core/services/auth.service';
import { TradingService } from '../../../core/services/trading.service';
import { ApiService } from '../../../core/services/api.service';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { By } from '@angular/platform-browser';
import { TradingActivityResponse } from '../../../core/models/trading.models';
import { BarChartComponent } from '../components/bar-chart/bar-chart';
import { PieChartComponent } from '../components/pie-chart/pie-chart';

const ACTIVITY: TradingActivityResponse = {
  from: '2026-10-22T18:00:00.000Z',
  to: '2026-10-23T18:00:00.000Z',
  interval: 'hour',
  points: [{ timestamp: '2026-10-23T12:00:00Z', tradeCount: 4 }],
};

describe('AdminDashboard', () => {
  let component: AdminDashboard;
  let fixture: ComponentFixture<AdminDashboard>;
  const getTradingActivity = vi.fn(() => of(ACTIVITY));

  beforeEach(async () => {
    getTradingActivity.mockReset().mockReturnValue(of(ACTIVITY));
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
      getTradingActivity,
    };

    await TestBed.configureTestingModule({
      imports: [AdminDashboard],
      providers: [
        { provide: AuthService, useValue: { profile: () => null, user: () => null, signOut: () => Promise.resolve() } },
        provideRouter([]),
        { provide: TradingService, useValue: trading },
        { provide: ApiService, useValue: {} },
      ],
    }).overrideComponent(BarChartComponent, { set: { template: '' } })
      .overrideComponent(PieChartComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(AdminDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => vi.restoreAllMocks());

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
    component.searchQuery.set('jordan.lee@example.com');
    component.searchClient();
    component.setClient('client-yyyy');

    expect(component.selectedAccountId()).toBe('client-yyyy');
    expect(component.selectedAccount()?.name).toBe('Jordan Lee');
    expect(component.activeTab()).toBe('orders');
  });

  it('shows only the selected client portfolio holdings', () => {
    component.searchQuery.set('alex.morgan@example.com');
    component.searchClient();
    component.searchQuery.set('jordan.lee@example.com');
    component.searchClient();
    component.setClient('client-yyyy');

    expect(component.portfolioHoldings().map(holding => holding.symbol)).toEqual(['AMZN', 'NVDA']);

    component.searchQuery.set('taylor.smith@example.com');
    component.searchClient();
    component.setClient('client-zzzz');

    expect(component.portfolioHoldings().map(holding => holding.symbol)).toEqual(['TSLA']);
  });

  it('shows only the selected client orders', () => {
    component.searchQuery.set('alex.morgan@example.com');
    component.searchClient();
    component.searchQuery.set('jordan.lee@example.com');
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

  it('shows a client-selection prompt and does not request activity before selection', () => {
    fixture.detectChanges();
    expect(getTradingActivity).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Search for a client to view trading activity');
    expect(fixture.nativeElement.querySelectorAll('.activity-ranges button')).toHaveLength(5);
    expect(fixture.nativeElement.querySelector('app-bar-chart')).toBeNull();
  });

  it('requests trailing ranges with the correct UTC bounds and bucket intervals', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-23T18:00:00.000Z'));
    try {
      component.searchQuery.set('alex.morgan@example.com');
      component.searchClient();
      const cases = [
        { range: '1D', from: '2026-10-22T18:00:00.000Z', interval: 'hour' },
        { range: '1W', from: '2026-10-16T18:00:00.000Z', interval: 'day' },
        { range: '1M', from: '2026-09-23T18:00:00.000Z', interval: 'day' },
        { range: '3M', from: '2026-07-23T18:00:00.000Z', interval: 'day' },
        { range: '1Y', from: '2025-10-23T18:00:00.000Z', interval: 'week' },
      ] as const;
      for (const { range, from, interval } of cases) {
        component.setActivityRange(range);
        expect(getTradingActivity).toHaveBeenLastCalledWith({
          clientEmail: 'alex.morgan@example.com', from,
          to: '2026-10-23T18:00:00.000Z', interval,
        });
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it('clamps calendar-month and year ranges at month ends and leap days', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date('2026-03-31T18:00:00.000Z'));
      component.searchQuery.set('alex.morgan@example.com');
      component.searchClient();
      component.setActivityRange('1M');
      expect(getTradingActivity).toHaveBeenLastCalledWith(expect.objectContaining({
        from: '2026-02-28T18:00:00.000Z',
      }));
      vi.setSystemTime(new Date('2024-02-29T18:00:00.000Z'));
      component.setActivityRange('1Y');
      expect(getTradingActivity).toHaveBeenLastCalledWith(expect.objectContaining({
        from: '2023-02-28T18:00:00.000Z',
      }));
    } finally {
      vi.useRealTimers();
    }
  });

  it('passes backend counts to the chart and changes ranges through the controls', () => {
    component.searchQuery.set('alex.morgan@example.com');
    component.searchClient();
    fixture.detectChanges();
    const chart = fixture.debugElement.query(By.directive(BarChartComponent)).componentInstance as BarChartComponent;
    expect(chart.data()).toEqual(ACTIVITY.points);
    expect(chart.interval()).toBe('hour');
    expect(fixture.nativeElement.textContent).toContain('4 trades in this period');
    fixture.nativeElement.querySelectorAll('.activity-ranges button')[1].click();
    fixture.detectChanges();
    expect(component.activityRange()).toBe('1W');
    expect(getTradingActivity).toHaveBeenLastCalledWith(expect.objectContaining({ interval: 'day' }));
    expect(fixture.nativeElement.querySelectorAll('.activity-ranges button')[1].getAttribute('aria-pressed')).toBe('true');
  });

  it('cancels stale activity when the range or client changes', () => {
    const first = new Subject<TradingActivityResponse>();
    const second = new Subject<TradingActivityResponse>();
    const third = new Subject<TradingActivityResponse>();
    getTradingActivity.mockReturnValueOnce(first).mockReturnValueOnce(second).mockReturnValueOnce(third);
    component.searchQuery.set('alex.morgan@example.com');
    component.searchClient();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading trading activity');
    component.setActivityRange('1W');
    first.next(ACTIVITY);
    expect(component.tradingActivity()).toBeNull();
    component.searchQuery.set('jordan.lee@example.com');
    component.searchClient();
    expect(getTradingActivity).toHaveBeenLastCalledWith(expect.objectContaining({
      clientEmail: 'jordan.lee@example.com',
    }));
    second.next(ACTIVITY);
    expect(component.tradingActivity()).toBeNull();
    third.next(ACTIVITY);
    expect(component.tradingActivity()).toEqual(ACTIVITY);
    expect(component.loadingActivity()).toBe(false);
  });

  it('shows zero-count and empty results without mock charts', () => {
    for (const points of [[], [{ timestamp: '2026-10-23T12:00:00Z', tradeCount: 0 }]]) {
      getTradingActivity.mockReturnValueOnce(of({ ...ACTIVITY, points }));
      component.searchQuery.set('alex.morgan@example.com');
      component.searchClient();
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('No trades in this period');
      expect(fixture.nativeElement.querySelector('app-bar-chart')).toBeNull();
    }
  });

  it('shows errors without stale counts and allows retry', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    component.searchQuery.set('alex.morgan@example.com');
    component.searchClient();
    getTradingActivity.mockReturnValueOnce(throwError(() => new Error('Unavailable')));
    component.setActivityRange('1W');
    fixture.detectChanges();
    expect(component.tradingActivity()).toBeNull();
    expect(component.loadingActivity()).toBe(false);
    expect(fixture.nativeElement.querySelector('.trading-activity [role="alert"]').textContent)
      .toContain('Unable to load trading activity');
    expect(fixture.nativeElement.querySelector('app-bar-chart')).toBeNull();
    fixture.nativeElement.querySelector('.activity-retry').click();
    fixture.detectChanges();
    expect(component.activityError()).toBeNull();
    expect(component.totalTrades()).toBe(4);
  });

  it('unsubscribes from trading activity on destruction', () => {
    const response = new Subject<TradingActivityResponse>();
    getTradingActivity.mockReturnValueOnce(response);
    component.searchQuery.set('alex.morgan@example.com');
    component.searchClient();
    fixture.destroy();
    response.next(ACTIVITY);
    expect(component.tradingActivity()).toBeNull();
  });
});
