import { Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
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
  imports: [AgCharts, RouterLink],
  styleUrl: './balance-graph.css',
  templateUrl: './balance-graph.html',
})
export class BalanceGraph {
  readonly ranges = ['1D', '1W', '1M', '3M', '1Y', 'ALL'] as const;
  readonly selectedRange = signal<(typeof this.ranges)[number]>('ALL');
  graphData = input<BalanceGraphInterface[]>([]);
  readonly hasGraphData = computed(() => this.graphData().length > 0);
  readonly filteredGraphData = computed(() => {
    const data = this.graphData();
    const range = this.selectedRange();

    if (range === 'ALL' || data.length === 0) {
      return data;
    }

    const days = { '1W': 7, '1M': 30, '3M': 90, '1Y': 365 } as const;
    const cutoff = range === '1D'
      ? Date.now() - (24 * 60 * 60 * 1000)
      : Date.now() - (days[range as keyof typeof days] * 24 * 60 * 60 * 1000);

    return data.filter((point) => this.toTimestamp(point.date) >= cutoff);
  });
  readonly isEmpty = computed(() => this.filteredGraphData().length === 0);
  selectRange(range: (typeof this.ranges)[number]): void {
    this.selectedRange.set(range);
  }

  selectRangeFromEvent(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (this.ranges.includes(value as (typeof this.ranges)[number])) {
      this.selectRange(value as (typeof this.ranges)[number]);
    }
  }

  options = computed((): AgCartesianChartOptions => ({
    background: {
      fill: 'transparent',
    },
    padding: {
      top: 24,
      right: 0,
      bottom: 0,
      left: 0,
    },
    series: [
      {
        type: "line",
        data: this.filteredGraphData(),
        xKey: "date",
        yKey: "balance",
        yName: "Account Balance",
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
          formatter: (params) => {
            const date = new Date(params.value);
            if (Number.isNaN(date.getTime())) {
              return '';
            }
            if (this.selectedRange() === '1D') {
              return date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              });
            }
            return date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });
          },
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

  private toTimestamp(value: string): number {
    // Date-only values are normalized to end-of-day UTC so rolling windows (like 1D)
    // include the most recent point from the previous day when applicable.
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? `${value}T23:59:59.999Z`
      : value;
    return new Date(normalized).getTime();
  }


}
