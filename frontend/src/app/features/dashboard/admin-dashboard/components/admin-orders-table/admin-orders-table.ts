import { Component, input } from '@angular/core';
import { ColDef } from 'ag-grid-community';
import { DataGrid } from '../../../components/data-grid/data-grid';
import type { AdminOrder } from '../../admin-dashboard';

@Component({
    imports: [DataGrid],
    selector: 'app-admin-orders-table',
    standalone: true,
    styleUrls: ['./admin-orders-table.css'],
    templateUrl: './admin-orders-table.html',
})
export class AdminOrdersTableComponent {
    rowData = input<AdminOrder[] | null>(null);

    columnDefs: ColDef<AdminOrder>[] = [
        { field: 'trackingId', headerName: 'Tracking ID', width: 150 },
        { field: 'action', headerName: 'Action', width: 100 },
        { field: 'symbol', headerName: 'Symbol', width: 100 },
        { field: 'name', headerName: 'Name', width: 150 },
        { field: 'transactionDate', headerName: 'Date', width: 120 },
        { field: 'shares', headerName: 'Shares', width: 100 },
        { field: 'price', headerName: 'Price', width: 100 },
        { field: 'instrument', headerName: 'Type', width: 120 },
        { field: 'status', headerName: 'Order Status', width: 130 },
    ];
}
