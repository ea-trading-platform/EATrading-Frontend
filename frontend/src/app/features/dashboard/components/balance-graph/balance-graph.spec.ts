import { ComponentFixture, TestBed } from '@angular/core/testing';
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

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
