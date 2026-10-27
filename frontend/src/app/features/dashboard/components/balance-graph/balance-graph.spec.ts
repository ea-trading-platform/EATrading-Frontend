import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { BalanceGraph } from './balance-graph';

describe('BalanceGraph', () => {
  let component: BalanceGraph;
  let fixture: ComponentFixture<BalanceGraph>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BalanceGraph],
    }).compileComponents();

    fixture = TestBed.createComponent(BalanceGraph);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('filters 1D using a rolling 24-hour window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-27T18:00:00.000Z'));

    fixture.componentRef.setInput('graphData', [
      { date: '2026-10-26T20:00:00.000Z', balance: 1025 },
      { date: '2026-10-26T17:59:59.000Z', balance: 1010 },
      { date: '2026-10-27T10:00:00.000Z', balance: 1030 },
    ]);
    component.selectRange('1D');
    fixture.detectChanges();

    expect(component.filteredGraphData()).toEqual([
      { date: '2026-10-26T20:00:00.000Z', balance: 1025 },
      { date: '2026-10-27T10:00:00.000Z', balance: 1030 },
    ]);
  });

  it('keeps previous-day date-only points in 1D when they fall within last 24 hours', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-27T12:00:00.000Z'));

    fixture.componentRef.setInput('graphData', [
      { date: '2026-10-26', balance: 1000 },
      { date: '2026-10-25', balance: 990 },
      { date: '2026-10-27', balance: 1015 },
    ]);
    component.selectRange('1D');
    fixture.detectChanges();

    expect(component.filteredGraphData()).toEqual([
      { date: '2026-10-26', balance: 1000 },
      { date: '2026-10-27', balance: 1015 },
    ]);
  });

  it('shows a flat 1D line using the latest known balance when there are no datapoints inside the last 24 hours', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-27T18:00:00.000Z'));

    fixture.componentRef.setInput('graphData', [
      { date: '2026-10-25T18:00:00.000Z', balance: 980 },
      { date: '2026-10-26T10:00:00.000Z', balance: 995 },
      { date: '2026-10-26T17:00:00.000Z', balance: 1002 },
    ]);
    component.selectRange('1D');
    fixture.detectChanges();

    expect(component.filteredGraphData()).toEqual([
      { date: '2026-10-26T18:00:00.000Z', balance: 1002 },
      { date: '2026-10-27T18:00:00.000Z', balance: 1002 },
    ]);
  });
});
