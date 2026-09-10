import { Component, input, output } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import {
  AllCommunityModule,
  ColDef,
  GridOptions,
  ModuleRegistry,
  RowClickedEvent,
  RowSelectionOptions,
  SelectionChangedEvent,
  themeQuartz,
} from 'ag-grid-community';

// registers grid features once for the whole app on first import
ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  imports: [AgGridAngular],
  selector: 'app-data-grid',
  standalone: true,
  styleUrl: './data-grid.css',
  templateUrl: './data-grid.html',
})
export class DataGrid<T = any> {
  columnDefs = input.required<ColDef<T>[]>();
  rowData = input<T[] | null>(null);
  // autoHeight sizes the grid to fit all rows instead of scrolling within a fixed box
  gridOptions = input<GridOptions<T>>({ domLayout: 'autoHeight' });
  loading = input(false);
  defaultColDef = input<ColDef<T>>({ sortable: true, resizable: true, flex: 1, suppressMovable: false });
  rowSelection = input<RowSelectionOptions<T> | undefined>(undefined);

  rowClicked = output<RowClickedEvent<T>>();
  selectionChanged = output<SelectionChangedEvent<T>>();

  protected readonly theme = themeQuartz.withParams({
    backgroundColor: 'var(--dark-primary)',
    foregroundColor: 'var(--text-light)',
    borderColor: 'var(--border-light)',
    oddRowBackgroundColor: 'rgba(171, 179, 191, 0.03)',
    rowHoverColor: 'var(--bg-hover)',
    accentColor: 'var(--accent)',
  });
}
