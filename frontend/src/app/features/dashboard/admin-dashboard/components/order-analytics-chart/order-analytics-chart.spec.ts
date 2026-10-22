import { TestBed } from '@angular/core/testing';
import { AgCartesianChartOptions, AgPolarChartOptions } from 'ag-charts-community';
import { OrderAnalyticsChart } from './order-analytics-chart';

describe('OrderAnalyticsChart', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [OrderAnalyticsChart] })
            .overrideComponent(OrderAnalyticsChart, { set: { template: '' } });
    });

    it('maps every backend category and updates when counts change', () => {
        const fixture = TestBed.createComponent(OrderAnalyticsChart);
        fixture.componentRef.setInput('title', 'Orders by instrument');
        fixture.componentRef.setInput('counts', { CASH: 1, EQUITY: 6, CRYPTO: 3 });
        const chart = fixture.componentInstance;
        expect(chart.total()).toBe(10);
        expect(chart.data().map(({ label, count }) => ({ label, count }))).toEqual([
            { label: 'CASH', count: 1 }, { label: 'EQUITY', count: 6 }, { label: 'CRYPTO', count: 3 },
        ]);
        fixture.componentRef.setInput('counts', {});
        expect(chart.total()).toBe(0);
        expect(chart.data()).toEqual([]);
    });

    it('configures a count-based donut without portfolio currency labels', () => {
        const fixture = TestBed.createComponent(OrderAnalyticsChart);
        fixture.componentRef.setInput('title', 'Buy vs Sell');
        fixture.componentRef.setInput('counts', { BUY: 7, SELL: 3 });
        fixture.componentRef.setInput('kind', 'donut');
        const options = fixture.componentInstance.options() as AgPolarChartOptions;
        expect(options.series?.[0]).toMatchObject({
            type: 'donut', angleKey: 'count', legendItemKey: 'label', innerRadiusRatio: 0.62,
        });
    });

    it('configures vertical instrument bars and horizontal status bars with numeric count axes', () => {
        const fixture = TestBed.createComponent(OrderAnalyticsChart);
        fixture.componentRef.setInput('title', 'Counts');
        fixture.componentRef.setInput('counts', { FILLED: 5, REJECTED: 1 });
        const chart = fixture.componentInstance;
        let options = chart.options() as AgCartesianChartOptions;
        expect(options.series?.[0]).toMatchObject({
            type: 'bar', direction: 'vertical', xKey: 'label', yKey: 'count', yName: 'Orders',
        });
        expect(options.axes?.x?.type).toBe('category');
        expect(options.axes?.y?.type).toBe('number');
        fixture.componentRef.setInput('direction', 'horizontal');
        options = chart.options() as AgCartesianChartOptions;
        expect(options.series?.[0]).toMatchObject({ direction: 'horizontal' });
        expect(options.axes?.x?.type).toBe('number');
        expect(options.axes?.y?.type).toBe('category');
    });
});
