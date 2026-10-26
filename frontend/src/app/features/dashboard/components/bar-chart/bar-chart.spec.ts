import { TestBed } from '@angular/core/testing';
import { AgBarSeriesOptions } from 'ag-charts-community';
import { BarChartComponent } from './bar-chart';

describe('BarChartComponent trading activity', () => {
  it('plots chronological backend trade counts with local-time labels and no mock data', async () => {
    await TestBed.configureTestingModule({ imports: [BarChartComponent] })
      .overrideComponent(BarChartComponent, { set: { template: '' } })
      .compileComponents();
    const fixture = TestBed.createComponent(BarChartComponent);
    fixture.componentRef.setInput('interval', 'hour');
    fixture.componentRef.setInput('data', [
      { timestamp: '2026-10-23T12:00:00Z', tradeCount: 4 },
      { timestamp: '2026-10-23T11:00:00Z', tradeCount: 0 },
    ]);
    const options = fixture.componentInstance.options();
    expect(options.title?.text).toBe('Number of trades');
    expect(options.series?.[0]).toEqual(expect.objectContaining({
      xKey: 'timestamp',
      yKey: 'tradeCount',
      yName: 'Number of trades',
      data: [
        expect.objectContaining({ timestamp: '2026-10-23T11:00:00Z', tradeCount: 0 }),
        expect.objectContaining({ timestamp: '2026-10-23T12:00:00Z', tradeCount: 4 }),
      ],
    }));
    const axis = options.axes?.x;
    if (axis?.type !== 'category') {
      throw new Error('Expected a category axis');
    }
    const timestamp = '2026-10-23T00:00:00Z';
    const label = axis.label?.formatter;
    expect(typeof label).toBe('function');
    const expected = new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(new Date(timestamp));
    expect(label?.({
      value: timestamp, type: 'category', index: 0, boundSeries: [], domain: [timestamp],
    })).toBe(expected);

    const series = options.series?.[0] as AgBarSeriesOptions;
    const tooltip = series.tooltip?.renderer;
    const expectedTooltip = new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
      timeZoneName: 'short',
    }).format(new Date(timestamp));
    expect(tooltip?.({
      datum: { timestamp, tradeCount: 2 }, xKey: 'timestamp', yKey: 'tradeCount', seriesId: 'trades',
    })).toEqual({
      title: expectedTooltip, content: '2 trades',
    });
    for (const interval of ['day', 'week']) {
      fixture.componentRef.setInput('interval', interval);
      const dateAxis = fixture.componentInstance.options().axes?.x;
      if (dateAxis?.type !== 'category') {
        throw new Error('Expected a category axis');
      }
      expect(dateAxis.label?.formatter?.({
        value: timestamp, type: 'category', index: 0, boundSeries: [], domain: [timestamp],
      })).toBe(new Intl.DateTimeFormat('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      }).format(new Date(timestamp)));
    }
    fixture.componentRef.setInput('interval', 'hour');
    fixture.componentRef.setInput('data', [
      { timestamp: '2026-11-01T05:00:00Z', tradeCount: 1 },
      { timestamp: '2026-11-01T06:00:00Z', tradeCount: 2 },
    ]);
    expect(fixture.componentInstance.options().series?.[0]).toEqual(expect.objectContaining({
      xKey: 'timestamp',
      data: [
        { timestamp: '2026-11-01T05:00:00Z', tradeCount: 1 },
        { timestamp: '2026-11-01T06:00:00Z', tradeCount: 2 },
      ],
    }));
    fixture.componentRef.setInput('data', []);
    expect(fixture.componentInstance.options().series?.[0]).toEqual(expect.objectContaining({ data: [] }));
  });
});
