import { Component, Input } from '@angular/core';
import { AgCharts } from 'ag-charts-angular';
import { AgChartOptions, DonutSeriesModule, LegendModule, ModuleRegistry } from 'ag-charts-community';

ModuleRegistry.registerModules([LegendModule, DonutSeriesModule]);

const PORTFOLIO_COLORS = ['#66bfe2', '#a287e6', '#e4a076', '#88a4b8'];

@Component({
  standalone: true,
  imports: [AgCharts],
  selector: 'app-pie-chart',
  styleUrls: ['./pie-chart.css'],
  templateUrl: './pie-chart.html',
})
export class PieChartComponent {
  protected chartData: Array<{ label: string; value: number }> = [];
  protected readonly totalValueAmount = '$100,000';

  public chartOptions: AgChartOptions = {
    series: [
      ({
        type: 'donut',
        labelKey: 'label',
        angleKey: 'value',
        legendItemKey: 'label',
        innerRadiusRatio: 0.62,
        fills: PORTFOLIO_COLORS,
      } as any)
    ],
    background: {
      fill: 'none',
    },
    legend: {
      enabled: false,
    }
  };

  protected get totalValue(): number {
    return this.chartData.reduce((sum, item) => sum + item.value, 0);
  }

  protected getPercentage(value: number): string {
    return this.totalValue > 0 ? `${((value / this.totalValue) * 100).toFixed(0)}%` : '0%';
  }

  @Input()
  public set data(value: Array<{ label: string; value: number }> | undefined) {
    if (!value) return;
    this.chartData = value;
    this.chartOptions = {
      ...this.chartOptions,
      data: value,
    } as AgChartOptions;
  }
}