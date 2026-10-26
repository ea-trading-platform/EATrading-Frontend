import { Component, computed, input } from '@angular/core';
import { AgCharts } from 'ag-charts-angular';
import { TradeInterval, TradingActivityPoint } from '../../../../core/models/trading.models';
import {
  AgBarSeriesOptions,
  AgCartesianChartOptions,
  BarSeriesModule,
  CategoryAxisModule,
  ModuleRegistry,
  NumberAxisModule,
} from 'ag-charts-community';

ModuleRegistry.registerModules([
  BarSeriesModule,
  CategoryAxisModule,
  NumberAxisModule,
]);

@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [AgCharts],
  styleUrl: './bar-chart.css',
  templateUrl: './bar-chart.html',
})
export class BarChartComponent {
  data = input.required<TradingActivityPoint[]>();
  interval = input.required<TradeInterval>();

  private formatTimestamp(timestamp: string): string {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      ...(this.interval() === 'hour' ? { hour: '2-digit', minute: '2-digit' } as const : {}),
    }).format(new Date(timestamp));
  }

  options = computed<AgCartesianChartOptions>(() => ({
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
      text: 'Number of trades',
      fontSize: 16,
      fontWeight: 'bold',
      color: '#f4f6fb',
    },
    series: [
      {
        type: 'bar',
        direction: 'vertical',
        data: [...this.data()]
          .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
          .map(point => ({ ...point, label: this.formatTimestamp(point.timestamp) })),
        xKey: 'label',
        yKey: 'tradeCount',
        yName: 'Number of trades',
        fill: '#007a7a',
        stroke: '#4ecccc',
        strokeWidth: 1,
        tooltip: {
          renderer: ({ datum }: { datum: TradingActivityPoint }) => ({
            title: `${this.interval() === 'week' ? 'Week of ' : ''}${this.formatTimestamp(datum.timestamp)} UTC`,
            content: `${datum.tradeCount.toLocaleString()} ${datum.tradeCount === 1 ? 'trade' : 'trades'}`,
          }),
        },
      } satisfies AgBarSeriesOptions,
    ],
    axes: {
      x: {
        type: 'category',
        label: {
          fontSize: 12,
          color: 'rgba(255, 255, 255, 0.7)',
        },
      },
      y: {
        type: 'number',
        min: 0,
        label: {
          fontSize: 12,
          color: 'rgba(255, 255, 255, 0.7)',
          formatter: ({ value }: { value: number }) => Number.isInteger(value) ? value.toLocaleString() : '',
        },
        gridLine: {
          style: [{ stroke: 'rgba(255, 255, 255, 0.1)', lineDash: [4, 2] }],
        },
      },
    },
    legend: {
      enabled: false,
    },
  }));
}
