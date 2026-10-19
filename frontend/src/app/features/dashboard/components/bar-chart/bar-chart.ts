import { Component, computed, input } from '@angular/core';
import { AgCharts } from 'ag-charts-angular';
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

interface TradingVolumePoint {
  date: string;
  volume: number;
}

const MOCK_TRADING_VOLUME: TradingVolumePoint[] = [
  { date: 'Jan 08', volume: 12400 },
  { date: 'Jan 09', volume: 18200 },
  { date: 'Jan 10', volume: 15100 },
  { date: 'Jan 11', volume: 22800 },
  { date: 'Jan 12', volume: 19700 },
  { date: 'Jan 15', volume: 26400 },
  { date: 'Jan 16', volume: 21900 },
];

@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [AgCharts],
  styleUrl: './bar-chart.css',
  templateUrl: './bar-chart.html',
})
export class BarChartComponent {
  data = input<TradingVolumePoint[]>(MOCK_TRADING_VOLUME);

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
      text: 'Trading Volume',
      fontSize: 16,
      fontWeight: 'bold',
      color: '#f4f6fb',
    },
    series: [
      {
        type: 'bar',
        direction: 'vertical',
        data: this.data(),
        xKey: 'date',
        yKey: 'volume',
        yName: 'Volume',
        fill: '#007a7a',
        stroke: '#4ecccc',
        strokeWidth: 1,
        tooltip: {
          renderer: ({ datum }: { datum: TradingVolumePoint }) =>
            `${datum.volume.toLocaleString()} shares`,
        },
      } as AgBarSeriesOptions,
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
        label: {
          fontSize: 12,
          color: 'rgba(255, 255, 255, 0.7)',
          formatter: ({ value }: { value: number }) => value.toLocaleString(),
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
