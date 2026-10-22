import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TradingService } from './trading.service';
import { OrderAnalyticsResponse } from '../models/trading.models';

describe('Order analytics API integration', () => {
    let http: HttpTestingController;
    let trading: TradingService;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        http = TestBed.inject(HttpTestingController);
        trading = TestBed.inject(TradingService);
    });

    afterEach(() => http.verify());

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
            totalOrders: 1, totalQuantity: '0.00001234', buyOrders: 0, sellOrders: 1,
            filledOrders: 1, pendingOrders: 0, canceledOrders: 0, rejectedOrders: 0,
            ordersByInstrument: { CRYPTO: 1 }, ordersBySide: { SELL: 1 }, ordersByStatus: { FILLED: 1 },
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
