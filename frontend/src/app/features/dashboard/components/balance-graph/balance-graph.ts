import { Component, computed, input } from '@angular/core';
import { AgCharts } from "ag-charts-angular";
import {
  AgChartOptions,
  AgCartesianChartOptions,
  AgLineSeriesOptions,
  CategoryAxisModule,
  LegendModule,
  LineSeriesModule,
  ModuleRegistry,
  NumberAxisModule,
  UnitTimeAxisModule,
} from "ag-charts-community";
import { BalanceGraphInterface } from '../../interfaces/balances-graph.interface';

ModuleRegistry.registerModules([
  CategoryAxisModule,
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

  options = computed((): AgCartesianChartOptions => ({
    background: {
      fill: 'transparent',
    },
    padding: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    title: {
      text: "Total Account Balance",
      fontSize: 16,
      fontWeight: 'bold',
      color: 'rgba(255, 255, 255, 0.9)',
    },
    series: [
      {
        type: "line",
        data: this.graphData(),
        xKey: "date",
        yKey: "balance",
        yName: "Account Balance",
        interpolation: { type: "smooth" },
        stroke: '#007a7a',
        strokeWidth: 2.5,
        marker: {
          shape: 'circle',
          size: 5,
          fill: '#4ecccc',
          // stroke: 'rgba(255, 255, 255, 0.8)',
          // strokeWidth: 2,
        },
        tooltip: {
          enabled: true,
          renderer: (params: any) => {
            const date = new Date(params.datum.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });
            const balance = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD'
            }).format(params.datum.balance);
            return `${date}<br/>${balance}`;
          }
        },
      } as AgLineSeriesOptions,
    ],
    axes: {
      x: {
        type: "unit-time",
        label: {
          fontSize: 12,
          color: 'rgba(255, 255, 255, 0.7)',
        },
      },
      y: {
        type: "number",
        label: {
          format: "$#{0.2f}",
          fontSize: 12,
          color: 'rgba(255, 255, 255, 0.7)',
        },
        gridLine: {
          style: [{ strokeWidth: 0, stroke: 'rgba(255, 255, 255, 0.1)', lineDash: [4, 2] }],
        },
      },
    },
    legend: {
      enabled: false,
      position: 'bottom',
      item: {
        label: {
          fontSize: 12,
          color: 'rgba(255, 255, 255, 0.7)',
        },
      },
    },
  }));


}
