import { Component, input, output } from '@angular/core';
import { ColDef, IHeaderComp, IHeaderParams } from 'ag-grid-community';
import { DataGrid } from '../data-grid/data-grid';
import { PortfolioTable } from '../../interfaces/portfolio-table.interface';

type AllocationHeaderParams = IHeaderParams<PortfolioTable> & {
  onShowChart?: () => void;
};

class AllocationHeaderComponent implements IHeaderComp {
  private gui!: HTMLDivElement;

  init(params: AllocationHeaderParams): void {
    this.gui = document.createElement('div');
    this.gui.className = 'allocation-header';

    const label = document.createElement('span');
    label.className = 'allocation-header-label';
    label.textContent = params.displayName;
    label.addEventListener('click', (event: MouseEvent) => {
      event.stopPropagation();
      params.progressSort(event.shiftKey);
    });

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'allocation-header-button';
    button.textContent = 'Chart';
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      params.onShowChart?.();
    });

    this.gui.append(label, button);
  }

  getGui(): HTMLElement {
    return this.gui;
  }

  refresh(params: AllocationHeaderParams): boolean {
    const label = this.gui.querySelector('.allocation-header-label');
    if (label) {
      label.textContent = params.displayName;
    }

    return true;
  }
}

@Component({
  imports: [DataGrid],
  selector: 'app-portfolio-table',
  standalone: true,
  styleUrls: ['./portfolio-table.css'],
  templateUrl: './portfolio-table.html',
})
export class PortfolioTableComponent {
  rowData = input<PortfolioTable[] | null>(null);
  allocationChartRequested = output<void>();

  columnDefs: ColDef<PortfolioTable>[] = [
    { field: 'symbol', headerName: 'Symbol', width: 100 },
    { field: 'name', headerName: 'Name', width: 150 },
    { field: 'shares', headerName: 'Shares', width: 100 },
    { field: 'value', headerName: 'Value', width: 120 },
    {
      field: 'allocation',
      headerName: 'Allocation %',
      width: 190,
      headerComponent: AllocationHeaderComponent,
      headerComponentParams: {
        onShowChart: () => this.allocationChartRequested.emit(),
      },
    },
    { field: 'dayChange', headerName: 'Day Change', width: 120 },
    { field: 'overallReturn', headerName: 'Overall Return', width: 140 },
  ];
}
