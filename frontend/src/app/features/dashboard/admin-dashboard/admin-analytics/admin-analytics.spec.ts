import { TestBed, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { OrderAnalyticsResponse } from '../../../../core/models/trading.models';
import { OrderAnalyticsFilters } from '../../../../core/models/trading.models';
import { AuthService } from '../../../../core/services/auth.service';
import { TradingService } from '../../../../core/services/trading.service';
import { BarChartComponent } from '../../components/bar-chart/bar-chart';
import { OrderAnalyticsChart } from '../components/order-analytics-chart/order-analytics-chart';
import { AdminAnalytics } from './admin-analytics';

const ANALYTICS: OrderAnalyticsResponse = {
    totalOrders: 10,
    totalQuantity: '123.125',
    ordersByInstrument: { EQUITY: 6, CRYPTO: 3, CASH: 1 },
    ordersBySide: { BUY: 7, SELL: 3 },
    ordersByStatus: { FILLED: 5, SUBMITTED: 1, ACCEPTED: 1, CANCELED: 2, REJECTED: 1 },
    tradeCounts: [
        { timestamp: '2026-10-21T00:00:00Z', tradeCount: 3 },
        { timestamp: '2026-10-22T00:00:00Z', tradeCount: 7 },
    ],
};

describe('AdminAnalytics', () => {
    let fixture: ComponentFixture<AdminAnalytics>;
    let component: AdminAnalytics;
    const getOrderAnalytics = vi.fn((_filters: OrderAnalyticsFilters) => of(ANALYTICS));

    beforeEach(async () => {
        getOrderAnalytics.mockReset().mockReturnValue(of(ANALYTICS));
        await TestBed.configureTestingModule({
            imports: [AdminAnalytics],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: { signOut: vi.fn() } },
                { provide: TradingService, useValue: { getOrderAnalytics } },
            ],
        }).overrideComponent(OrderAnalyticsChart, { set: { template: '' } })
            .overrideComponent(BarChartComponent, { set: { template: '' } })
            .compileComponents();
        fixture = TestBed.createComponent(AdminAnalytics);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('loads aggregate analytics and renders all summary cards and chart breakdowns', () => {
        expect(getOrderAnalytics).toHaveBeenCalledTimes(1);
        const initialFilters = getOrderAnalytics.mock.lastCall?.[0];
        expect(initialFilters?.interval).toBe('hour');
        expect(Date.parse(initialFilters?.to ?? '') - Date.parse(initialFilters?.from ?? ''))
            .toBe(24 * 60 * 60 * 1000);
        const text: string = fixture.nativeElement.textContent;
        expect(fixture.nativeElement.querySelector('.quantity-summary')).toBeNull();
        expect(text).not.toContain('Total ordered quantity');
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
        const tradeCountsChart = fixture.debugElement.query(By.directive(BarChartComponent))
            .componentInstance as BarChartComponent;
        expect(tradeCountsChart.data()).toEqual(ANALYTICS.tradeCounts);
        expect(tradeCountsChart.interval()).toBe('hour');
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

    it('combines custom date-times and filters in one request using the selected bucket interval', () => {
        component.range = 'CUSTOM';
        component.fromDate = '2026-10-01T09:15';
        component.toDate = '2026-10-22T15:30';
        component.customInterval = 'week';
        component.instrument = 'CRYPTO';
        component.side = 'SELL';
        component.status = 'FILLED';
        component.applyFilters();
        expect(getOrderAnalytics).toHaveBeenLastCalledWith({
            from: new Date('2026-10-01T09:15').toISOString(),
            to: new Date('2026-10-22T15:30').toISOString(),
            interval: 'week',
            instrument: 'CRYPTO',
            side: 'SELL',
            status: 'FILLED',
        });
    });

    it('allows a same-day custom range when the start time is before the end time', () => {
        component.range = 'CUSTOM';
        component.fromDate = '2026-10-22T08:00';
        component.toDate = '2026-10-22T17:00';
        component.applyFilters();
        expect(component.error()).toBeNull();
        expect(getOrderAnalytics).toHaveBeenLastCalledWith(expect.objectContaining({
            from: new Date('2026-10-22T08:00').toISOString(),
            to: new Date('2026-10-22T17:00').toISOString(),
            interval: 'day',
        }));
    });

    it('requests the matching bucket interval for each preset range', () => {
        const expectedIntervals = new Map([
            ['1D', 'hour'],
            ['1W', 'day'],
            ['1M', 'day'],
            ['1Y', 'week'],
            ['ALL', 'week'],
        ]);
        for (const [range, interval] of expectedIntervals) {
            component.range = range as typeof component.range;
            component.applyFilters();
            expect(getOrderAnalytics.mock.lastCall?.[0]).toEqual(expect.objectContaining({
                interval,
                from: expect.any(String),
                to: expect.any(String),
            }));
        }
        component.range = 'ALL';
        component.applyFilters();
        expect(getOrderAnalytics.mock.lastCall?.[0].from).toBe('1970-01-01T00:00:00.000Z');
    });

    it('loads preset ranges immediately and keeps the chart interval aligned with the fetched data', () => {
        const initialCallCount = getOrderAnalytics.mock.calls.length;
        component.onRangeChange('1M');
        fixture.detectChanges();
        expect(getOrderAnalytics).toHaveBeenCalledTimes(initialCallCount + 1);
        const filters = getOrderAnalytics.mock.lastCall?.[0];
        expect(filters?.interval).toBe('day');
        const rangeMs = Date.parse(filters?.to ?? '') - Date.parse(filters?.from ?? '');
        expect(rangeMs).toBeGreaterThan(28 * 24 * 60 * 60 * 1000);
        expect(rangeMs).toBeLessThanOrEqual(31 * 24 * 60 * 60 * 1000);
        const chart = fixture.debugElement.query(By.directive(BarChartComponent))
            .componentInstance as BarChartComponent;
        expect(chart.interval()).toBe('day');
    });

    it('rejects an inverted date range without requesting data', () => {
        component.range = 'CUSTOM';
        component.fromDate = '2026-10-23T12:00';
        component.toDate = '2026-10-22T12:00';
        component.applyFilters();
        expect(component.error()).toContain('start date-time');
        expect(getOrderAnalytics).toHaveBeenCalledTimes(1);
    });

    it('rejects invalid dates visibly', () => {
        component.range = 'CUSTOM';
        component.fromDate = 'not-a-date';
        component.toDate = '2026-10-22T12:00';
        component.applyFilters();
        expect(component.error()).toBe('Enter valid start and end date-times for a custom range.');
        expect(getOrderAnalytics).toHaveBeenCalledTimes(1);
    });

    it('clears all filters and reloads unfiltered analytics', () => {
        component.fromDate = '2026-10-01T10:00';
        component.toDate = '2026-10-22T16:30';
        component.instrument = 'EQUITY';
        component.side = 'BUY';
        component.status = 'ACCEPTED';
        component.range = 'CUSTOM';
        component.clearFilters();
        expect([component.fromDate, component.toDate,
            component.instrument, component.side, component.status, component.range])
            .toEqual(['', '', '', '', '', '1D']);
        const filters = getOrderAnalytics.mock.lastCall?.[0];
        expect(filters?.interval).toBe('hour');
        expect(filters?.instrument).toBeUndefined();
        expect(filters?.side).toBeUndefined();
        expect(filters?.status).toBeUndefined();
        expect(Date.parse(filters?.to ?? '') - Date.parse(filters?.from ?? '')).toBe(24 * 60 * 60 * 1000);
    });

    it('shows loading, cancels superseded requests, and does not retain stale results', () => {
        const first = new Subject<OrderAnalyticsResponse>();
        const second = new Subject<OrderAnalyticsResponse>();
        getOrderAnalytics.mockReturnValueOnce(first).mockReturnValueOnce(second);
        component.applyFilters();
        fixture.detectChanges();
        expect(component.analytics()).toBeNull();
        expect(fixture.nativeElement.textContent).toContain('Loading order analytics');
        expect(fixture.nativeElement.querySelector('.analytics-filters').disabled).toBe(true);
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
            ...ANALYTICS, totalOrders: 0, totalQuantity: 0,
            ordersByInstrument: {}, ordersBySide: {}, ordersByStatus: {},
            tradeCounts: [],
        }));
        component.applyFilters();
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('No orders match these filters');
        expect(fixture.debugElement.queryAll(By.directive(OrderAnalyticsChart))).toHaveLength(0);
        expect(fixture.debugElement.queryAll(By.directive(BarChartComponent))).toHaveLength(0);
    });

    it('reports when analytics has no trade-count buckets', () => {
        getOrderAnalytics.mockReturnValueOnce(of({ ...ANALYTICS, tradeCounts: [] }));
        component.applyFilters();
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('No trade count data is available');
        expect(fixture.debugElement.queryAll(By.directive(BarChartComponent))).toHaveLength(0);
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
