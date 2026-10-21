import { Component, computed, input, output } from '@angular/core';
import { ColDef, GridOptions } from 'ag-grid-community';
import { DataGrid } from '../dashboard/components/data-grid/data-grid';

export interface TransactPositionRow {
    symbol: string;
    name: string;
    quantity: number;
    averageCost: number;
    currentPrice: number;
    value: number;
}

export interface TransactOrderRow {
    id: string;
    trackingId?: string;
    orderType: string;
    symbol: string;
    quantity: number;
    status: string;
    executedAt?: string;
}

export type TradeGridMode = 'positions' | 'orders';
type TradeGridRow = TransactPositionRow | TransactOrderRow;

@Component({
    imports: [DataGrid],
    selector: 'app-trade-data-grid',
    standalone: true,
    template: `
        <app-data-grid
            [columnDefs]="columnDefs()"
            [rowData]="rowData()"
            [gridOptions]="gridOptions()">
        </app-data-grid>
    `,
    styles: [':host { display: block; width: 100%; }'],
})
export class TradeDataGrid {
    readonly mode = input.required<TradeGridMode>();
    readonly rowData = input.required<TransactPositionRow[] | TransactOrderRow[]>();
    readonly tradeAction = output<{ symbol: string; side: 'BUY' | 'SELL'; name: string }>();

    protected readonly columnDefs = computed(() => {
        const columns = this.mode() === 'positions' ? this.positionColumns() : this.orderColumns();
        return columns as ColDef<TradeGridRow>[];
    });

    protected readonly gridOptions = computed<GridOptions<TradeGridRow>>(() => ({
        domLayout: 'autoHeight',
        suppressCellFocus: true,
    }));

    private readonly currencyFormatter = (params: { value: number }): string =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(params.value ?? 0);

    private positionColumns(): ColDef<TransactPositionRow>[] {
        return [
            { field: 'symbol', headerName: 'Symbol', minWidth: 110 },
            { field: 'name', headerName: 'Name', minWidth: 170, flex: 1 },
            { field: 'quantity', headerName: 'Quantity', minWidth: 110 },
            { field: 'averageCost', headerName: 'Average cost', minWidth: 135, valueFormatter: this.currencyFormatter },
            { field: 'currentPrice', headerName: 'Current price', minWidth: 135, valueFormatter: this.currencyFormatter },
            { field: 'value', headerName: 'Value', minWidth: 125, valueFormatter: this.currencyFormatter },
            {
                colId: 'actions',
                headerName: 'Actions',
                minWidth: 155,
                sortable: false,
                cellRenderer: (params: { data: TransactPositionRow }) => {
                    const container = document.createElement('div');
                    container.className = 'grid-actions';
                    container.style.display = 'flex';
                    container.style.alignItems = 'center';
                    container.style.gap = '0.4rem';
                    for (const side of ['BUY', 'SELL'] as const) {
                        const button = document.createElement('button');
                        button.type = 'button';
                        button.className = `grid-action ${side === 'BUY' ? 'grid-buy' : 'grid-sell'}`;
                        button.textContent = side === 'BUY' ? 'Buy' : 'Sell';
                        button.style.border = '0';
                        button.style.borderRadius = '0.3rem';
                        button.style.padding = '0.35rem 0.6rem';
                        button.style.color = '#08131c';
                        button.style.cursor = 'pointer';
                        button.style.fontSize = '0.75rem';
                        button.style.fontWeight = '800';
                        button.style.background = side === 'BUY' ? '#65d6a0' : '#e06c75';
                        button.addEventListener('click', (event) => {
                            event.stopPropagation();
                            this.tradeAction.emit({ symbol: params.data.symbol, side, name: params.data.name });
                        });
                        container.appendChild(button);
                    }
                    return container;
                },
            },
        ];
    }

    private orderColumns(): ColDef<TransactOrderRow>[] {
        return [
            { field: 'trackingId', headerName: 'Tracking ID', minWidth: 220 },
            { field: 'orderType', headerName: 'Action', minWidth: 100 },
            { field: 'symbol', headerName: 'Symbol', minWidth: 115 },
            { field: 'quantity', headerName: 'Quantity', minWidth: 110 },
            { headerName: 'Order type', valueGetter: () => 'Market', minWidth: 120 },
            { field: 'status', headerName: 'Status', minWidth: 125 },
            { field: 'executedAt', headerName: 'Date', minWidth: 170, valueFormatter: (params) => params.value || 'Pending' },
        ];
    }
}
