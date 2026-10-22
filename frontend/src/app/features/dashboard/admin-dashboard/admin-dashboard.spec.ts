import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminDashboard } from './admin-dashboard';

describe('AdminDashboard', () => {
  let component: AdminDashboard;
  let fixture: ComponentFixture<AdminDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDashboard],
      providers: [provideRouter([])],
    })
      .overrideComponent(AdminDashboard, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(AdminDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts with the first client and portfolio tab selected', () => {
    expect(component.selectedAccountId()).toBe('client-xxxx');
    expect(component.activeTab()).toBe('portfolio');
  });

  it('changes the selected client without changing the dashboard section', () => {
    component.setTab('orders');
    component.setClient('client-yyyy');

    expect(component.selectedAccountId()).toBe('client-yyyy');
    expect(component.selectedAccount().name).toBe('Jordan Lee');
    expect(component.activeTab()).toBe('orders');
  });

  it('shows only the selected client portfolio holdings', () => {
    component.setClient('client-yyyy');

    expect(component.portfolioHoldings().map(holding => holding.symbol)).toEqual(['AMZN', 'NVDA']);

    component.setClient('client-zzzz');

    expect(component.portfolioHoldings().map(holding => holding.symbol)).toEqual(['TSLA']);
  });

  it('shows only the selected client orders', () => {
    component.setClient('client-yyyy');

    expect(component.orderHistory().map(order => order.symbol)).toEqual(['AMZN']);

    component.setClient('client-xxxx');

    expect(component.orderHistory().map(order => order.symbol)).toEqual(['TSLA', 'AAPL']);
  });

  it('adds a searched client to the tabs and selects it', () => {
    component.searchQuery.set('client-yyyy');
    component.searchClient();

    expect(component.selectedAccountId()).toBe('client-yyyy');
    expect(component.selectedAccount().email).toBe('jordan.lee@example.com');
    expect(component.clients().map(client => client.id)).toEqual(['client-xxxx', 'client-yyyy']);
  });
});
