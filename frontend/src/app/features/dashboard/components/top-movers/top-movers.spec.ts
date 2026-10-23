import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { environment } from '../../../../../environments/environment';
import { MarketMover, MarketMoversResponse } from '../../../../core/models/trading.models';
import { StockCardComponent } from '../stock-card/stock-card';
import { By } from '@angular/platform-browser';
import { TopMoversComponent } from './top-movers';

describe('TopMoversComponent', () => {
    let fixture: ComponentFixture<TopMoversComponent>;
    let http: HttpTestingController;
    const url = `${environment.apiBaseUrl}/api/v1/market/movers`;
    const gainer: MarketMover = {
        symbol: 'AAPL',
        currency: 'USD',
        close: 210,
        adjustedClose: 105,
        previousAdjustedClose: 100,
        date: '2026-10-22',
        previousDate: '2026-10-21',
        changePercent: 5,
        synthetic: false,
        stale: null,
        partial: null,
    };
    const loser: MarketMover = {
        ...gainer,
        symbol: 'MSFT',
        close: 190,
        adjustedClose: 95,
        changePercent: -5,
    };
    const response: MarketMoversResponse = {
        symbols: ['AAPL', 'MSFT'],
        stocks: [gainer, loser],
        gainers: [gainer],
        losers: [loser],
        unavailableSymbols: [],
    };

    beforeEach(() => {
        vi.useFakeTimers();
        TestBed.configureTestingModule({
            imports: [TopMoversComponent],
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        fixture = TestBed.createComponent(TopMoversComponent);
        http = TestBed.inject(HttpTestingController);
        fixture.detectChanges();
    });

    afterEach(() => {
        fixture.destroy();
        http.verify();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    function render(data: MarketMoversResponse = response): void {
        const request = http.expectOne(url);
        expect(request.request.method).toBe('GET');
        request.flush(data);
        fixture.detectChanges();
    }

    function text(): string {
        return fixture.nativeElement.textContent;
    }

    it('shows loading, then the returned raw close and adjusted daily percentage without a mock sparkline', () => {
        expect(text()).toContain('Loading daily movers');
        render();
        const card: StockCardComponent = fixture.debugElement.query(By.directive(StockCardComponent)).componentInstance;
        expect(card.stock).toEqual({ symbol: 'AAPL', price: 210, changePercent: 5 });
        expect(card.getChangeDisplay(card.stock)).toBe('+5.00%');
        expect(text()).toContain('2026-10-21 to 2026-10-22');
        expect(text()).toContain('USD close');
        expect(fixture.nativeElement.querySelector('app-sparkline')).toBeNull();
        expect(text()).not.toContain('Stale');
    });

    it('preserves server ranking order and rotates every five seconds without refetching', () => {
        const second = { ...gainer, symbol: 'NVDA', changePercent: 2 };
        render({ ...response, gainers: [gainer, second] });
        expect(fixture.componentInstance.movers().map((stock) => stock.symbol)).toEqual(['AAPL', 'NVDA']);
        vi.advanceTimersByTime(4999);
        expect(fixture.componentInstance.isShowingGainers()).toBe(true);
        vi.advanceTimersByTime(1);
        fixture.detectChanges();
        expect(text()).toContain('Top Losers');
        expect(text()).toContain('MSFT');
        expect(text()).toContain('-5.00%');
        vi.advanceTimersByTime(5000);
        expect(fixture.componentInstance.isShowingGainers()).toBe(true);
        http.expectNone(url);
    });

    it('renders partial-watchlist warnings and per-stock quality metadata', () => {
        render({
            ...response,
            unavailableSymbols: ['INTC', 'DIS'],
            gainers: [{ ...gainer, synthetic: true, stale: true, partial: true }],
        });
        expect(text()).toContain('Data unavailable for: INTC, DIS');
        expect(text()).toContain('Synthetic');
        expect(text()).toContain('Stale');
        expect(text()).toContain('Partial');
        expect(fixture.nativeElement.querySelectorAll('app-stock-card')).toHaveLength(1);
    });

    it('shows empty rankings without substituting mock stocks', () => {
        render({ ...response, gainers: [], losers: [] });
        expect(text()).toContain('No gainers available');
        vi.advanceTimersByTime(5000);
        fixture.detectChanges();
        expect(text()).toContain('No losers available');
        expect(fixture.nativeElement.querySelector('app-stock-card')).toBeNull();
    });

    it('shows a request failure and retries successfully', () => {
        const log = vi.spyOn(console, 'error').mockImplementation(() => {});
        http.expectOne(url).flush({ message: 'No usable data' }, { status: 502, statusText: 'Bad Gateway' });
        fixture.detectChanges();
        expect(text()).toContain('Unable to load daily movers');
        expect(log).toHaveBeenCalled();
        fixture.nativeElement.querySelector('button').click();
        fixture.detectChanges();
        expect(text()).toContain('Loading daily movers');
        render();
        expect(text()).toContain('AAPL');
        expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    });

    it('cancels an in-flight request on destruction', () => {
        const request = http.expectOne(url);
        fixture.destroy();
        expect(request.cancelled).toBe(true);
    });

    it('stops the rotation on destruction', () => {
        render();
        fixture.destroy();
        vi.advanceTimersByTime(5000);
        expect(fixture.componentInstance.isShowingGainers()).toBe(true);
    });
});
