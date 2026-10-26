import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { ClientDashboard } from './client-dashboard';

describe('ClientDashboard', () => {
  let component: ClientDashboard;
  let fixture: ComponentFixture<ClientDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientDashboard],
      providers: [provideRouter([])],
    })
      .overrideProvider(ApiService, {
        useValue: {
          getCandles: () => of({ candles: [] }),
          getQuote: (symbol: string) => of({ symbol, price: 0, previousClose: 0, change: 0, changePercent: 0 }),
        },
      })
      .overrideComponent(ClientDashboard, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(ClientDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
