import { Component, input } from '@angular/core';
import { ColDef } from 'ag-grid-community';
import { DataGrid } from '../data-grid/data-grid';
import { OrdersTable, OrderAction, OrderStatus, InstrumentType } from '../../interfaces/orders-table.interface';

@Component({
  imports: [DataGrid],
  selector: 'app-orders-table',
  standalone: true,
  styleUrls: ['./orders-table.css'],
  templateUrl: './orders-table.html',
})
export class OrdersTableComponent {
  rowData = input<OrdersTable[] | null>(null);

  columnDefs: ColDef<OrdersTable>[] = [
    { field: 'action', headerName: 'Action', width: 100 },
    { field: 'symbol', headerName: 'Symbol', width: 100 },
    { field: 'name', headerName: 'Name', width: 100 },
    { field: 'transactionDate', headerName: 'Date', width: 100 },
    { field: 'shares', headerName: 'Shares', width: 100 },
    { field: 'price', headerName: 'Price', width: 100 },
    { field: 'instrument', headerName: 'Type', width: 150 },
    { field: 'status', headerName: 'Order Status', width: 100}
  ];
}
