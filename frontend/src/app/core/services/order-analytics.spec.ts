import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TradingService } from './trading.service';
import { OrderAnalyticsResponse, TradingActivityResponse } from '../models/trading.models';

describe('Order analytics and trading activity API integration', () => {
    let http: HttpTestingController;
    let trading: TradingService;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        http = TestBed.inject(HttpTestingController);
        trading = TestBed.inject(TradingService);
    });

    afterEach(() => http.verify());

    it('requests trading activity by email, never by client ID, and preserves bucket counts', () => {
        const query = {
            clientEmail: 'alex+trading@example.com',
            from: '2026-10-22T18:00:00.000Z',
            to: '2026-10-23T18:00:00.000Z',
            interval: 'hour' as const,
        };
        const response: TradingActivityResponse = {
            from: query.from, to: query.to, interval: 'hour',
            points: [
                { timestamp: '2026-10-22T18:00:00Z', tradeCount: 12 },
                { timestamp: '2026-10-22T19:00:00Z', tradeCount: 0 },
            ],
        };
        let received: TradingActivityResponse | undefined;
        trading.getTradingActivity(query).subscribe(activity => received = activity);
        const request = http.expectOne(request => request.url.endsWith('/api/orders/trading-activity'));
        expect(request.request.method).toBe('GET');
        expect(request.request.params.keys().sort()).toEqual(['clientEmail', 'from', 'interval', 'to']);
        for (const [key, value] of Object.entries(query)) {
            expect(request.request.params.get(key)).toBe(value);
        }
        request.flush(response);
        expect(received).toEqual(response);
    });

    it('propagates trading activity failures instead of substituting empty activity', () => {
        let status: number | undefined;
        trading.getTradingActivity({
            clientEmail: 'alex@example.com', from: '2026-10-22T00:00:00Z',
            to: '2026-10-23T00:00:00Z', interval: 'day',
        }).subscribe({ error: error => status = error.status });
        http.expectOne(request => request.url.endsWith('/api/orders/trading-activity'))
            .flush(null, { status: 403, statusText: 'Forbidden' });
        expect(status).toBe(403);
    });

    it('requests the admin analytics endpoint without empty or undefined query parameters', () => {
        trading.getOrderAnalytics({ clientId: '', instrument: undefined }).subscribe();
        const request = http.expectOne(request => request.url.endsWith('/api/orders/analytics'));
        expect(request.request.method).toBe('GET');
        expect(request.request.params.keys()).toEqual([]);
        request.flush({});
    });

    it('sends composable filters and preserves the backend aggregate response', () => {
        const filters = {
            clientId: '12345678-1234-1234-1234-123456789abc',
            from: '2026-10-01T00:00:00.000Z',
            to: '2026-10-23T00:00:00.000Z',
            instrument: 'CRYPTO' as const,
            side: 'SELL' as const,
            status: 'FILLED' as const,
        };
        let received: OrderAnalyticsResponse | undefined;
        trading.getOrderAnalytics(filters).subscribe(response => received = response);
        const request = http.expectOne(request => request.url.endsWith('/api/orders/analytics'));
        for (const [key, value] of Object.entries(filters)) {
            expect(request.request.params.get(key)).toBe(value);
        }
        const response: OrderAnalyticsResponse = {
            totalOrders: 1, totalQuantity: '0.00001234',
            ordersByInstrument: { CRYPTO: 1 }, ordersBySide: { BUY: 0, SELL: 1 },
            ordersByStatus: { SUBMITTED: 0, ACCEPTED: 0, FILLED: 1, CANCELED: 0, REJECTED: 0 },
        };
        request.flush(response);
        expect(received).toEqual(response);
    });

    it('propagates backend failures instead of returning zero-valued analytics', () => {
        let status: number | undefined;
        trading.getOrderAnalytics().subscribe({ error: error => status = error.status });
        http.expectOne(request => request.url.endsWith('/api/orders/analytics'))
            .flush(null, { status: 403, statusText: 'Forbidden' });
        expect(status).toBe(403);
    });
});
