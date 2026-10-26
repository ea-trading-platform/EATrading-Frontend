import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ApiService } from '../../../../../core/services/api.service';
import { OrderStatusLog } from '../../../../../core/models/trading.models';
import { AdminOrder } from '../../admin-dashboard';
import { AdminOrdersTableComponent } from './admin-orders-table';

describe('Admin order history expansion', () => {
    const getOrderStatusLog = vi.fn();
    const order: AdminOrder = {
        clientId: 'client-1', trackingId: 'tracking-1', action: 'BUY', symbol: 'AAPL',
        name: 'Apple', transactionDate: new Date('2026-10-23T12:02:00Z'),
        shares: 2, price: 100, instrument: 'EQUITY', status: 'FILLED',
    };

    async function setup() {
        TestBed.configureTestingModule({
            imports: [AdminOrdersTableComponent],
            providers: [{ provide: ApiService, useValue: { getOrderStatusLog } }],
        });
        TestBed.overrideComponent(AdminOrdersTableComponent, {
            set: {
                imports: [],
                template: `@for (row of rows(); track $index) {
                    <div class="row">{{ row.status }} {{ row.historyMessage }} {{ row.transactionDate?.toISOString() }}
                        <span class="details">{{ row.action }}{{ row.symbol }}{{ row.name }}{{ row.shares }}{{ row.price }}{{ row.instrument }}{{ row.clientId }}</span>
                    </div>
                }`,
            },
        });
        const fixture = TestBed.createComponent(AdminOrdersTableComponent);
        fixture.componentRef.setInput('rowData', [order]);
        await fixture.whenStable();
        return fixture;
    }

    beforeEach(() => getOrderStatusLog.mockReset());

    it('does not request history when the tracking ID is missing', async () => {
        const fixture = await setup();
        fixture.componentRef.setInput('rowData', [{ ...order, trackingId: '' }]);
        fixture.componentInstance.toggleHistory('');
        await fixture.whenStable();
        expect(getOrderStatusLog).not.toHaveBeenCalled();
        expect(fixture.nativeElement.querySelectorAll('.row')).toHaveLength(1);
    });

    it('loads recorded states on demand, sorts them by time and collapses them', async () => {
        getOrderStatusLog.mockReturnValue(of({
            FILLED: { statusChangeTime: '2026-10-23T12:02:00Z' },
            SUBMITTED: { statusChangeTime: '2026-10-23T12:00:00Z' },
            ACCEPTED: { statusChangeTime: '2026-10-23T12:01:00Z' },
        } satisfies OrderStatusLog));
        const fixture = await setup();
        expect(getOrderStatusLog).not.toHaveBeenCalled();
        fixture.componentInstance.toggleHistory(order.trackingId);
        await fixture.whenStable();
        expect(getOrderStatusLog).toHaveBeenCalledExactlyOnceWith('tracking-1');
        const rows = Array.from(fixture.nativeElement.querySelectorAll('.row') as NodeListOf<HTMLElement>);
        expect(rows).toHaveLength(4);
        expect(rows.slice(1).map(row => row.textContent?.trim().split(' ')[0]))
            .toEqual(['SUBMITTED', 'ACCEPTED', 'FILLED']);
        expect(rows[1].textContent).toContain('2026-10-23T12:00:00.000Z');
        for (const row of rows.slice(1)) {
            expect(row.querySelector('.details')!.textContent?.trim()).toBe('');
        }
        fixture.componentInstance.toggleHistory(order.trackingId);
        await fixture.whenStable();
        expect(fixture.nativeElement.querySelectorAll('.row')).toHaveLength(1);
    });

    it('shows loading and empty history without inventing states', async () => {
        const result = new Subject<OrderStatusLog>();
        getOrderStatusLog.mockReturnValue(result);
        const fixture = await setup();
        fixture.componentInstance.toggleHistory(order.trackingId);
        await fixture.whenStable();
        expect(fixture.nativeElement.textContent).toContain('Loading status history');
        fixture.componentInstance.toggleHistory(order.trackingId);
        fixture.componentInstance.toggleHistory(order.trackingId);
        expect(getOrderStatusLog).toHaveBeenCalledOnce();
        result.next({});
        result.complete();
        await fixture.whenStable();
        expect(fixture.nativeElement.textContent).toContain('No status history recorded');
    });

    it('reports errors and retries on the next expansion', async () => {
        getOrderStatusLog.mockReturnValue(throwError(() => new Error('API unavailable')));
        const log = vi.spyOn(console, 'error').mockImplementation(() => {});
        try {
            const fixture = await setup();
            fixture.componentInstance.toggleHistory(order.trackingId);
            await fixture.whenStable();
            expect(fixture.nativeElement.textContent).toContain('Unable to load status history');
            expect(log).toHaveBeenCalled();
            fixture.componentInstance.toggleHistory(order.trackingId);
            getOrderStatusLog.mockReturnValue(of({
                SUBMITTED: { statusChangeTime: '2026-10-23T12:00:00Z' },
            } satisfies OrderStatusLog));
            fixture.componentInstance.toggleHistory(order.trackingId);
            await fixture.whenStable();
            expect(getOrderStatusLog).toHaveBeenCalledTimes(2);
            expect(fixture.nativeElement.textContent).not.toContain('Unable to load');
        } finally {
            log.mockRestore();
        }
    });
});
