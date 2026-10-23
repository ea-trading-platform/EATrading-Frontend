import { TestBed, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { OrderAnalyticsResponse } from '../../../../core/models/trading.models';
import { AuthService } from '../../../../core/services/auth.service';
import { TradingService } from '../../../../core/services/trading.service';
import { OrderAnalyticsChart } from '../components/order-analytics-chart/order-analytics-chart';
import { AdminAnalytics } from './admin-analytics';

const ANALYTICS: OrderAnalyticsResponse = {
    totalOrders: 10,
    totalQuantity: '123.125',
    buyOrders: 7,
    sellOrders: 3,
    filledOrders: 5,
    pendingOrders: 2,
    canceledOrders: 2,
    rejectedOrders: 1,
    ordersByInstrument: { EQUITY: 6, CRYPTO: 3, CASH: 1 },
    ordersBySide: { BUY: 7, SELL: 3 },
    ordersByStatus: { FILLED: 5, SUBMITTED: 1, ACCEPTED: 1, CANCELED: 2, REJECTED: 1 },
};

describe('AdminAnalytics', () => {
    let fixture: ComponentFixture<AdminAnalytics>;
    let component: AdminAnalytics;
    const getOrderAnalytics = vi.fn(() => of(ANALYTICS));

    beforeEach(async () => {
        getOrderAnalytics.mockReset().mockReturnValue(of(ANALYTICS));
        await TestBed.configureTestingModule({
            imports: [AdminAnalytics],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: { signOut: vi.fn() } },
                { provide: TradingService, useValue: { getOrderAnalytics } },
            ],
        }).overrideComponent(OrderAnalyticsChart, { set: { template: '' } }).compileComponents();
        fixture = TestBed.createComponent(AdminAnalytics);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('loads aggregate analytics and renders all summary cards and chart breakdowns', () => {
        expect(getOrderAnalytics).toHaveBeenCalledTimes(1);
        const text: string = fixture.nativeElement.textContent;
        expect(text).toContain('123.125');
        expect(Array.from(fixture.nativeElement.querySelectorAll('.stat-value'), (element: Element) =>
            element.textContent?.trim())).toEqual(['10', '1', '5', '1', '2', '1']);
        const labels = Array.from(fixture.nativeElement.querySelectorAll('.metric-card .stat-label'),
            (element: Element) => element.textContent?.trim());
        expect(labels).toContain('Accepted');
        expect(labels).not.toContain('Pending');
        const charts = fixture.debugElement.queryAll(By.directive(OrderAnalyticsChart))
            .map(element => element.componentInstance as OrderAnalyticsChart);
        expect(charts).toHaveLength(3);
        expect(charts[0].kind()).toBe('donut');
        expect(charts[0].counts()).toEqual(ANALYTICS.ordersBySide);
        expect(charts[1].counts()).toEqual(ANALYTICS.ordersByInstrument);
        expect(charts[2].direction()).toBe('horizontal');
        expect(charts[2].counts()).toEqual(ANALYTICS.ordersByStatus);
        expect(fixture.nativeElement.querySelector('a[href="/admin-analytics"]')).not.toBeNull();
    });

    it('shows zero submitted orders when the status breakdown has no submitted entry', () => {
        getOrderAnalytics.mockReturnValueOnce(of({
            ...ANALYTICS, ordersByStatus: { FILLED: 10 },
        }));
        component.applyFilters();
        fixture.detectChanges();
        const submittedCard = Array.from(
            fixture.nativeElement.querySelectorAll('.metric-card') as NodeListOf<HTMLElement>,
        ).find(card => card.textContent?.includes('Submitted'));
        expect(submittedCard?.querySelector('.stat-value')?.textContent?.trim()).toBe('0');
    });

    it('shows zero accepted orders when the status breakdown has no accepted entry', () => {
        getOrderAnalytics.mockReturnValueOnce(of({
            ...ANALYTICS, ordersByStatus: { FILLED: 10 },
        }));
        component.applyFilters();
        fixture.detectChanges();
        const acceptedCard = Array.from(
            fixture.nativeElement.querySelectorAll('.metric-card') as NodeListOf<HTMLElement>,
        ).find(card => card.textContent?.includes('Accepted'));
        expect(acceptedCard?.querySelector('.stat-value')?.textContent?.trim()).toBe('0');
    });

    it('combines every selected filter into a single request with inclusive local calendar dates', () => {
        component.clientId = ' 12345678-1234-1234-1234-123456789abc ';
        component.fromDate = '2026-10-01';
        component.toDate = '2026-10-22';
        component.instrument = 'CRYPTO';
        component.side = 'SELL';
        component.status = 'FILLED';
        component.applyFilters();
        expect(getOrderAnalytics).toHaveBeenLastCalledWith({
            clientId: '12345678-1234-1234-1234-123456789abc',
            from: new Date(2026, 9, 1).toISOString(),
            to: new Date(2026, 9, 23).toISOString(),
            instrument: 'CRYPTO',
            side: 'SELL',
            status: 'FILLED',
        });
    });

    it('allows a single-day range', () => {
        component.fromDate = '2026-10-22';
        component.toDate = '2026-10-22';
        component.applyFilters();
        expect(component.error()).toBeNull();
        expect(getOrderAnalytics).toHaveBeenLastCalledWith(expect.objectContaining({
            from: new Date(2026, 9, 22).toISOString(),
            to: new Date(2026, 9, 23).toISOString(),
        }));
    });

    it('rejects an inverted date range without requesting data', () => {
        component.fromDate = '2026-10-23';
        component.toDate = '2026-10-22';
        component.applyFilters();
        expect(component.error()).toContain('From date');
        expect(getOrderAnalytics).toHaveBeenCalledTimes(1);
    });

    it('rejects invalid dates and client IDs visibly', () => {
        component.fromDate = 'not-a-date';
        component.applyFilters();
        expect(component.error()).toBe('Enter valid dates.');
        component.fromDate = '';
        component.clientId = 'not-a-uuid';
        component.applyFilters();
        expect(component.error()).toContain('UUID');
        expect(getOrderAnalytics).toHaveBeenCalledTimes(1);
    });

    it('clears all filters and reloads unfiltered analytics', () => {
        component.clientId = '12345678-1234-1234-1234-123456789abc';
        component.fromDate = '2026-10-01';
        component.toDate = '2026-10-22';
        component.instrument = 'EQUITY';
        component.side = 'BUY';
        component.status = 'ACCEPTED';
        component.clearFilters();
        expect([component.clientId, component.fromDate, component.toDate,
            component.instrument, component.side, component.status]).toEqual(['', '', '', '', '', '']);
        expect(getOrderAnalytics).toHaveBeenLastCalledWith({
            clientId: undefined, from: undefined, to: undefined,
            instrument: undefined, side: undefined, status: undefined,
        });
    });

    it('shows loading, cancels superseded requests, and does not retain stale results', () => {
        const first = new Subject<OrderAnalyticsResponse>();
        const second = new Subject<OrderAnalyticsResponse>();
        getOrderAnalytics.mockReturnValueOnce(first).mockReturnValueOnce(second);
        component.applyFilters();
        fixture.detectChanges();
        expect(component.analytics()).toBeNull();
        expect(fixture.nativeElement.textContent).toContain('Loading order analytics');
        expect(fixture.nativeElement.querySelector('fieldset').disabled).toBe(true);
        component.applyFilters();
        first.next(ANALYTICS);
        expect(component.analytics()).toBeNull();
        second.next(ANALYTICS);
        fixture.detectChanges();
        expect(component.loading()).toBe(false);
        expect(component.analytics()).toEqual(ANALYTICS);
    });

    it('shows request errors without stale charts and supports retry', () => {
        const log = vi.spyOn(console, 'error').mockImplementation(() => {});
        getOrderAnalytics.mockReturnValueOnce(throwError(() => new Error('Unavailable')));
        component.applyFilters();
        fixture.detectChanges();
        expect(component.loading()).toBe(false);
        expect(component.analytics()).toBeNull();
        expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Unable to load');
        expect(log).toHaveBeenCalled();
        component.applyFilters();
        expect(component.error()).toBeNull();
        expect(component.analytics()).toEqual(ANALYTICS);
        log.mockRestore();
    });

    it('shows an empty result without misleading charts', () => {
        getOrderAnalytics.mockReturnValueOnce(of({
            ...ANALYTICS, totalOrders: 0, totalQuantity: 0, filledOrders: 0, pendingOrders: 0,
            canceledOrders: 0, rejectedOrders: 0, buyOrders: 0, sellOrders: 0,
            ordersByInstrument: {}, ordersBySide: {}, ordersByStatus: {},
        }));
        component.applyFilters();
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('No orders match these filters');
        expect(fixture.debugElement.queryAll(By.directive(OrderAnalyticsChart))).toHaveLength(0);
    });

    it('unsubscribes from analytics when the page is destroyed', () => {
        const response = new Subject<OrderAnalyticsResponse>();
        getOrderAnalytics.mockReturnValueOnce(response);
        component.applyFilters();
        fixture.destroy();
        response.next(ANALYTICS);
        expect(component.analytics()).toBeNull();
    });
});
