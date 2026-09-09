import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StockTicker } from './stock-ticker';

describe('StockTicker', () => {
  let component: StockTicker;
  let fixture: ComponentFixture<StockTicker>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockTicker],
    }).compileComponents();

    fixture = TestBed.createComponent(StockTicker);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
