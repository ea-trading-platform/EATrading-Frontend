import { DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { AgCharts } from 'ag-charts-angular';
import {
    AgChartOptions,
    BarSeriesModule,
    CategoryAxisModule,
    DonutSeriesModule,
    ModuleRegistry,
    NumberAxisModule,
} from 'ag-charts-community';

ModuleRegistry.registerModules([
    BarSeriesModule, CategoryAxisModule, DonutSeriesModule, NumberAxisModule,
]);

const CHART_COLORS = ['#66bfe2', '#a287e6', '#e4a076', '#88a4b8', '#4ecccc'];

@Component({
    selector: 'app-order-analytics-chart',
    standalone: true,
    imports: [AgCharts, DecimalPipe],
    templateUrl: './order-analytics-chart.html',
    styleUrl: './order-analytics-chart.css',
})
export class OrderAnalyticsChart {
    readonly title = input.required<string>();
    readonly counts = input.required<Record<string, number>>();
    readonly kind = input<'donut' | 'bar'>('bar');
    readonly direction = input<'vertical' | 'horizontal'>('vertical');
    readonly data = computed(() => Object.entries(this.counts()).map(([label, count], index) => ({
        label,
        count,
        color: CHART_COLORS[index % CHART_COLORS.length],
    })));
    readonly total = computed(() => this.data().reduce((sum, item) => sum + item.count, 0));

    readonly options = computed<AgChartOptions>(() => {
        const common = {
            data: this.data(),
            background: { fill: 'transparent' },
            legend: { enabled: false },
        };
        if (this.kind() === 'donut') {
            return {
                ...common,
                series: [{
                    type: 'donut',
                    angleKey: 'count',
                    legendItemKey: 'label',
                    innerRadiusRatio: 0.62,
                    fills: CHART_COLORS,
                    strokes: CHART_COLORS,
                }],
            };
        }
        const categoryAxis = {
            type: 'category' as const,
            label: { color: 'rgba(255, 255, 255, 0.7)' },
        };
        const numberAxis = {
            type: 'number' as const,
            min: 0,
            interval: { step: 1 },
            label: { color: 'rgba(255, 255, 255, 0.7)', format: ',.0f' },
            gridLine: { style: [{ stroke: 'rgba(255, 255, 255, 0.1)', lineDash: [4, 2] }] },
        };
        return {
            ...common,
            series: [{
                type: 'bar',
                direction: this.direction(),
                xKey: 'label',
                yKey: 'count',
                yName: 'Orders',
                fill: '#007a7a',
                stroke: '#4ecccc',
                strokeWidth: 1,
            }],
            axes: this.direction() === 'horizontal'
                ? { x: numberAxis, y: categoryAxis }
                : { x: categoryAxis, y: numberAxis },
        };
    });
}
