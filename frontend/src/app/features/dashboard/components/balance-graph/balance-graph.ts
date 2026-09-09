import { Component, computed, input } from '@angular/core';
import { AgCharts } from "ag-charts-angular";
import {
  AgChartOptions,
  LegendModule,
  LineSeriesModule,
  ModuleRegistry,
  NumberAxisModule,
  UnitTimeAxisModule,
} from "ag-charts-community";
import { BalanceGraphInterface } from '../../interfaces/balances-graph.interface';

ModuleRegistry.registerModules([
  LegendModule,
  LineSeriesModule,
  NumberAxisModule,
  UnitTimeAxisModule,
]);

@Component({
  selector: 'app-balance-graph',
  standalone: true,
  imports: [AgCharts],
  styleUrl: './balance-graph.css',
  templateUrl: './balance-graph.html',
})
export class BalanceGraph {
  graphData = input<BalanceGraphInterface[]>([]);

  options = computed(() => ({
    title: {
      text: "Total Account Balance",
    },
    series: [
      {
        type: "line",
        data: this.graphData,
        xKey: "date",
        yKey: "balance",
        yName: "Account Balance",
      },
    ],
    axes: {
      x: {
        type: "unit-time",
      },
      y: {
        type: "number",
        label: {
          format: "#${0.2f}",
        },
      },
    },
  }));


}
