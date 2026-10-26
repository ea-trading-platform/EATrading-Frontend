import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../../../core/services/auth.service';
import { ApiService } from '../../../../../core/services/api.service';
import { TradingService } from '../../../../../core/services/trading.service';
import { OrderTransactionResponse } from '../../../../../core/models/trading.models';
import { AdminDashboard } from '../../admin-dashboard';
import { AdminTradeLogs } from '../../admin-trade-logs/admin-trade-logs';

describe('Admin order tracking IDs', () => {
    const orders: OrderTransactionResponse[] = [
        {
            orderId: 'order-only', clientId: 'client-1', symbol: 'AAPL',
            instrument: 'EQUITY', transactionType: 'BUY', quantity: '1',
            status: 'SUBMITTED', orderDate: '2026-10-23T12:00:00Z',
        },
        {
            orderId: 'different-order-id', trackingId: 'real-tracking-id',
            clientId: 'client-1', symbol: 'MSFT', instrument: 'EQUITY',
            transactionType: 'SELL', quantity: '2', status: 'FILLED',
            orderDate: '2026-10-23T12:01:00Z',
        },
    ];

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                TradingService,
                { provide: AuthService, useValue: { user: () => null } },
                { provide: Router, useValue: {} },
                { provide: ApiService, useValue: {
                    getClientByEmail: () => of({ id: 'client-1', name: 'Client', email: 'client@example.com' }),
                    getHoldings: () => of([]),
                    getOrders: () => of(orders),
                    getAllOrders: () => of(orders),
                } },
            ],
        });
    });

    it('never substitutes an order ID in the dashboard table', () => {
        const component = TestBed.runInInjectionContext(() => new AdminDashboard());
        component.searchQuery.set('client@example.com');
        component.searchClient();
        expect(component.orderHistory().map(order => order.trackingId))
            .toEqual(['real-tracking-id', '']);
    });

    it('never substitutes an order ID in the trade-log table', () => {
        const component = TestBed.runInInjectionContext(() => new AdminTradeLogs());
        component.ngOnInit();
        expect(component.orderHistory().map(order => order.trackingId))
            .toEqual(['real-tracking-id', '']);
    });
});
