import { Component, input } from '@angular/core';
import { ColDef } from 'ag-grid-community';
import { DataGrid } from '../data-grid/data-grid';
import { PortfolioTable } from '../../interfaces/portfolio-table.interface';

@Component({
  imports: [DataGrid],
  selector: 'app-portfolio-table',
  standalone: true,
  styleUrls: ['./portfolio-table.css'],
  templateUrl: './portfolio-table.html',
})
export class PortfolioTableComponent {
  rowData = input<PortfolioTable[] | null>(null);

  columnDefs: ColDef<PortfolioTable>[] = [
    { field: 'symbol', headerName: 'Symbol', width: 100 },
    { field: 'name', headerName: 'Name', width: 150 },
    { field: 'shares', headerName: 'Shares', width: 100 },
    { field: 'value', headerName: 'Value', width: 120 },
    { field: 'allocation', headerName: 'Allocation %', width: 120 },
    { field: 'dayChange', headerName: 'Day Change', width: 120 },
    { field: 'overallReturn', headerName: 'Overall Return', width: 140 },
  ];
}
