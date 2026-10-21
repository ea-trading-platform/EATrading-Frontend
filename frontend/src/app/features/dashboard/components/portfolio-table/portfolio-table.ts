import { Component, input } from '@angular/core';
import { ColDef, GridOptions } from 'ag-grid-community';
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
  gridOptions: GridOptions<PortfolioTable> = {
    domLayout: 'autoHeight',
    overlayNoRowsTemplate: 'No positions available.',
  };

  columnDefs: ColDef<PortfolioTable>[] = [
    { field: 'symbol', headerName: 'Symbol', width: 100 },
    { field: 'name', headerName: 'Name', width: 150 },
    { field: 'shares', headerName: 'Shares', width: 100 },
    { field: 'value', headerName: 'Value', width: 120 },
    {
      field: 'allocation',
      headerName: 'Allocation %',
      width: 120,
      valueFormatter: (params) => {
        const rawValue = params.value;
        const numericValue = typeof rawValue === 'number' ? rawValue : Number(rawValue);
        if (!Number.isFinite(numericValue)) {
          return '0.00%';
        }
        const percentValue = numericValue <= 1 ? numericValue * 100 : numericValue;
        return `${percentValue.toFixed(2)}%`;
      },
    },
  ];
}
