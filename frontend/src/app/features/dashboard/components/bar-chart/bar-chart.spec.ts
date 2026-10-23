import { TestBed } from '@angular/core/testing';
import { BarChartComponent } from './bar-chart';

describe('BarChartComponent trading activity', () => {
  it('plots chronological backend trade counts with UTC labels and no mock data', async () => {
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
      yKey: 'tradeCount',
      yName: 'Number of trades',
      data: [
        expect.objectContaining({ timestamp: '2026-10-23T11:00:00Z', tradeCount: 0, label: expect.stringContaining('11:00') }),
        expect.objectContaining({ timestamp: '2026-10-23T12:00:00Z', tradeCount: 4 }),
      ],
    }));
    fixture.componentRef.setInput('data', []);
    expect(fixture.componentInstance.options().series?.[0]).toEqual(expect.objectContaining({ data: [] }));
  });
});
