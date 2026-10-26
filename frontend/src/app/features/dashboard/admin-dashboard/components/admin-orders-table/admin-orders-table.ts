import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ColDef, GridOptions } from 'ag-grid-community';
import { DataGrid } from '../../../components/data-grid/data-grid';
import type { AdminOrder } from '../../admin-dashboard';
import { ApiService } from '../../../../../core/services/api.service';

type StatusEntry = { status: string; timestamp: string };
type HistoryState = { loading: boolean; entries: StatusEntry[]; error: string | null };
type OrderRow = Partial<Omit<AdminOrder, 'status' | 'trackingId'>> & {
    trackingId: string;
    status: string;
    history?: boolean;
    historyMessage?: string;
};

@Component({
    imports: [DataGrid],
    selector: 'app-admin-orders-table',
    standalone: true,
    styleUrls: ['./admin-orders-table.css'],
    templateUrl: './admin-orders-table.html',
})
export class AdminOrdersTableComponent {
    private readonly api = inject(ApiService);
    private readonly destroyRef = inject(DestroyRef);
    rowData = input<AdminOrder[] | null>(null);
    protected readonly expanded = signal<ReadonlySet<string>>(new Set());
    protected readonly history = signal<Record<string, HistoryState>>({});

    protected readonly rows = computed<OrderRow[]>(() => (this.rowData() ?? []).flatMap(order => {
        if (!this.expanded().has(order.trackingId)) {
            return [order];
        }
        const state = this.history()[order.trackingId];
        const message = state?.loading ? 'Loading status history...'
            : state?.error ?? (state?.entries.length ? null : 'No status history recorded.');
        const details: OrderRow[] = message
            ? [{ trackingId: order.trackingId, history: true, historyMessage: message, status: '' }]
            : (state?.entries ?? []).map(entry => ({
                trackingId: order.trackingId,
                history: true,
                status: entry.status,
                transactionDate: new Date(entry.timestamp),
            }));
        return [order, ...details];
    }));

    protected readonly gridOptions: GridOptions<OrderRow> = {
        domLayout: 'autoHeight',
        getRowStyle: ({ data }) => {
            if (!data?.history || data.historyMessage) {
                return undefined;
            }
            const colors: Record<string, { background: string; color: string }> = {
                SUBMITTED: { background: 'rgba(102, 191, 226, 0.12)', color: '#8ed4ee' },
                ACCEPTED: { background: 'rgba(162, 135, 230, 0.12)', color: '#c1acf0' },
                FILLED: { background: 'rgba(111, 214, 168, 0.12)', color: '#6fd6a8' },
                CANCELED: { background: 'rgba(228, 160, 118, 0.12)', color: '#e4a076' },
                REJECTED: { background: 'rgba(255, 77, 133, 0.12)', color: '#ff8aab' },
            };
            return colors[data.status.trim().toUpperCase()] ?? {
                background: 'var(--bg-subtle)', color: 'var(--text-muted)',
            };
        },
        postSortRows: ({ nodes }) => {
            const details = new Map<string, typeof nodes>();
            for (const node of nodes) {
                if (node.data?.history) {
                    const key = node.data.trackingId;
                    details.set(key, [...(details.get(key) ?? []), node]);
                }
            }
            const ordered = nodes.filter(node => !node.data?.history).flatMap(node => [
                node,
                ...(details.get(node.data?.trackingId ?? '') ?? []).sort((a, b) =>
                    (a.data?.transactionDate?.getTime() ?? 0) - (b.data?.transactionDate?.getTime() ?? 0)),
            ]);
            nodes.splice(0, nodes.length, ...ordered);
        },
    };

    toggleHistory(trackingId: string): void {
        if (!trackingId) {
            return;
        }
        const expanded = new Set(this.expanded());
        if (expanded.delete(trackingId)) {
            this.expanded.set(expanded);
            return;
        }
        expanded.add(trackingId);
        this.expanded.set(expanded);
        if (this.history()[trackingId]?.loading) {
            return;
        }
        this.history.update(history => ({
            ...history, [trackingId]: { loading: true, entries: [], error: null },
        }));
        this.api.getOrderStatusLog(trackingId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: log => {
                const entries = Object.entries(log)
                    .map(([status, entry]) => ({ status, timestamp: entry.statusChangeTime }))
                    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                this.history.update(history => ({
                    ...history, [trackingId]: { loading: false, entries, error: null },
                }));
            },
            error: error => {
                console.error(`Unable to load status history for ${trackingId}:`, error);
                this.history.update(history => ({
                    ...history,
                    [trackingId]: {
                        loading: false, entries: [],
                        error: 'Unable to load status history. Collapse and expand to retry.',
                    },
                }));
            },
        });
    }

    columnDefs: ColDef<OrderRow>[] = [
        {
            colId: 'history', headerName: '', width: 60, minWidth: 60, flex: 0,
            sortable: false, resizable: false,
            cellRenderer: (params: { data?: OrderRow }) => {
                if (!params.data || params.data.history) {
                    return '';
                }
                const trackingId = params.data.trackingId;
                const button = document.createElement('button');
                const expanded = this.expanded().has(trackingId);
                button.type = 'button';
                button.textContent = expanded ? '\u2304' : '\u203a';
                button.setAttribute('aria-expanded', String(expanded));
                button.setAttribute('aria-label', trackingId
                    ? `${expanded ? 'Hide' : 'Show'} status history for ${trackingId}`
                    : 'Status history unavailable: tracking ID not provided');
                button.title = trackingId ? 'Toggle status history' : 'Tracking ID not provided';
                button.disabled = !trackingId;
                button.style.cssText = 'background:transparent;border:0;color:inherit;font-size:1.3rem;cursor:pointer';
                button.addEventListener('click', event => {
                    event.stopPropagation();
                    this.toggleHistory(trackingId);
                });
                return button;
            },
        },
        { field: 'trackingId', headerName: 'Tracking ID', width: 150,
            valueGetter: params => params.data?.history ? '' : params.data?.trackingId },
        { field: 'action', headerName: 'Action', width: 100 },
        { field: 'symbol', headerName: 'Symbol', width: 100 },
        { field: 'name', headerName: 'Name', width: 150,
            tooltipValueGetter: params => params.data?.name },
        { field: 'transactionDate', headerName: 'Status time', width: 190,
            valueFormatter: params => {
                if (params.data?.historyMessage) {
                    return '';
                }
                const date = params.value;
                return date instanceof Date && Number.isFinite(date.getTime())
                    ? date.toLocaleString() : 'Unavailable';
            } },
        { field: 'shares', headerName: 'Shares', width: 100 },
        { field: 'price', headerName: 'Price', width: 100 },
        { field: 'instrument', headerName: 'Type', width: 120 },
        { field: 'status', headerName: 'Order Status', width: 160,
            valueGetter: params => params.data?.historyMessage ?? params.data?.status,
            tooltipValueGetter: params => params.data?.historyMessage ?? params.data?.status },
    ];
}
