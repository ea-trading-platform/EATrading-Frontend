import { Component, Input } from '@angular/core';
import { AgCharts } from 'ag-charts-angular';
import { LegendModule, ModuleRegistry, AgChartOptions, PieSeriesModule } from 'ag-charts-community';

ModuleRegistry.registerModules([LegendModule, PieSeriesModule]);
@Component({
  standalone: true,
  imports: [AgCharts],
  selector: 'app-pie-chart',
  styleUrls: ['./pie-chart.css'],
  templateUrl: './pie-chart.html',
})
export class PieChartComponent {
  public chartOptions: AgChartOptions = {
    title: {
      text: 'Allocation %',
      color: '#f4f6fb',
    },
    series: [
      ({
        type: 'pie',
        labelKey: 'label',
        angleKey: 'value',
        legendItemKey: 'label',
      } as any)
    ],
    background: {
      fill: 'none',
    },
    legend: {
      item: {
        label: {
          color: '#abb3bf',
        },
      }
    }
  };
  @Input()
  public set data(value: any[] | undefined) {
    if (!value) return;
    this.chartOptions = {
      ...this.chartOptions,
      data: value,
    } as AgChartOptions;
  }
}