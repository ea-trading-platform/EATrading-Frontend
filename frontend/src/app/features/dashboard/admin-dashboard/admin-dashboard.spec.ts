import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminDashboard } from './admin-dashboard';
import { AuthService } from '../../../core/services/auth.service';
import { TradingService } from '../../../core/services/trading.service';
import { ApiService } from '../../../core/services/api.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';

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
      { id: 'order-amzn', clientId: 'client-yyyy', symbol: 'AMZN', quantity: 3, orderType: 'BUY', status: 'PENDING', executedAt: '2024-01-25T00:00:00Z', price: 3200 },
      { id: 'order-tsla', clientId: 'client-xxxx', symbol: 'TSLA', quantity: 2, orderType: 'SELL', status: 'PENDING', executedAt: '2024-01-20T00:00:00Z', price: 238.9 },
      { id: 'order-aapl', clientId: 'client-xxxx', symbol: 'AAPL', quantity: 10, orderType: 'BUY', status: 'PENDING', executedAt: '2024-01-15T00:00:00Z', price: 190.5 },
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
    expect(component.selectedAccountId()).toBe('client-yyyy');
  });
});
