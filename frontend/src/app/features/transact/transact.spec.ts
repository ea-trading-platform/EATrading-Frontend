import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { TradingService } from '../../core/services/trading.service';
import { Transact } from './transact';

class TransactHarness extends Transact {
    readonly state = {
        symbol: this.symbol,
        side: this.orderSide,
        quantity: this.quantity,
        portfolio: this.portfolio,
        holdings: this.holdings,
        owned: this.ownedQuantity,
        error: this.error,
        suggestions: this.filteredSuggestions,
        validation: this.quantityValidationError,
        statusLog: this.statusLog,
        timeline: this.statusTimeline,
    };
}

describe('Transact currency and crypto symbols', () => {
    const getQuote = vi.fn();
    const getCandles = vi.fn();
    const submitOrder = vi.fn();
    let component: TransactHarness;

    beforeEach(() => {
        vi.useFakeTimers();
        getQuote.mockReset().mockImplementation((symbol: string) => of({
            symbol, price: 1.1, currency: 'USD',
        }));
        getCandles.mockReset().mockReturnValue(of({ candles: [] }));
        submitOrder.mockReset().mockReturnValue(of({ trackingId: 'tracking-1' }));
        TestBed.configureTestingModule({
            providers: [
                { provide: AuthService, useValue: { getClientId: () => 'client-1' } },
                { provide: Router, useValue: {} },
                { provide: ApiService, useValue: { getQuote, getCandles } },
                { provide: TradingService, useValue: { submitOrder } },
            ],
        });
        component = TestBed.runInInjectionContext(() => new TransactHarness());
        component.state.portfolio.set({
            clientId: 'client-1', availableCashUsd: 100000, portfolioValueUsd: 100000,
        });
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    it.each(['EUR', 'eurusd', 'FX:EURUSD', 'USDEUR', 'FX:USDEUR'])(
        'treats %s as the EUR holding and quotes the forward USD pair',
        (input) => {
            component.selectMarket('Forex');
            component.selectSymbol(input);
            expect(component.state.symbol()).toBe('EUR');
            expect(getQuote).toHaveBeenCalledWith('FX:EURUSD');
            expect(getCandles).toHaveBeenCalledWith('FX:EURUSD', expect.any(Object));
            expect(component.state.suggestions()).toEqual(['EUR']);
        },
    );

    it('uses rolling ISO time bounds from now for all preset ranges', () => {
        vi.setSystemTime(new Date('2026-10-27T18:00:00.000Z'));

        component.selectMarket('Equities');
        component.selectSymbol('AAPL');

        expect(getCandles).toHaveBeenLastCalledWith('AAPL', {
            from: '2026-10-26T18:00:00.000Z',
            to: '2026-10-27T18:00:00.000Z',
        });

        component.selectRange('1W');
        expect(getCandles).toHaveBeenLastCalledWith('AAPL', {
            from: '2026-10-20T18:00:00.000Z',
            to: '2026-10-27T18:00:00.000Z',
        });

        component.selectRange('1M');
        expect(getCandles).toHaveBeenLastCalledWith('AAPL', {
            from: '2026-09-27T18:00:00.000Z',
            to: '2026-10-27T18:00:00.000Z',
        });

        component.selectRange('3M');
        expect(getCandles).toHaveBeenLastCalledWith('AAPL', {
            from: '2026-07-29T18:00:00.000Z',
            to: '2026-10-27T18:00:00.000Z',
        });

        component.selectRange('1Y');
        expect(getCandles).toHaveBeenLastCalledWith('AAPL', {
            from: '2025-10-27T18:00:00.000Z',
            to: '2026-10-27T18:00:00.000Z',
        });
    });

    it.each(['BUY', 'SELL'] as const)('formats a forex %s order without changing the holding', (side) => {
        component.selectMarket('Forex');
        component.state.holdings.set([{
            clientId: 'client-1', symbol: 'EUR', instrument: 'CASH',
            quantity: '50', avgBuyPrice: '1.1', currentValue: '55',
        }]);
        component.selectSymbol('EURUSD');
        component.state.side.set(side);
        component.state.quantity.set(10);
        expect(component.state.owned()).toBe(50);
        component.submitOrder();
        expect(submitOrder).toHaveBeenCalledWith(expect.objectContaining({
            symbol: 'FX:EURUSD',
            transactionType: side, quantity: 10, instrument: 'CASH', instrumentType: 'CASH',
        }));
        expect(component.state.symbol()).toBe('EUR');
    });

    it.each(['EURGBP', 'USD', 'FX:USDUSD'])('rejects unsupported forex input %s', (input) => {
        component.selectMarket('Forex');
        component.selectSymbol(input);
        expect(component.state.error()).toContain('non-USD currency');
        expect(getQuote).not.toHaveBeenCalled();
        component.state.quantity.set(1);
        component.submitOrder();
        expect(submitOrder).not.toHaveBeenCalled();
    });

    it('offers holdings instead of inverse currency pairs', () => {
        component.selectMarket('Forex');
        expect(component.state.suggestions()).toEqual(['EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF']);
    });

    it.each(['BTC', 'ETH', 'SOL', 'XRP'])('uses X:%s-USD for crypto buys and sells', (coin) => {
        component.selectMarket('Crypto');
        component.state.holdings.set([{
            clientId: 'client-1', symbol: `X:${coin}-USD`, instrument: 'CRYPTO',
            quantity: '5', avgBuyPrice: '1', currentValue: '5',
        }]);
        component.selectSymbol(`x:${coin.toLowerCase()}-usd`);
        expect(component.state.symbol()).toBe(coin);
        expect(getQuote).toHaveBeenCalledWith(`X:${coin}-USD`);
        for (const side of ['BUY', 'SELL'] as const) {
            component.state.side.set(side);
            component.state.quantity.set(1);
            component.submitOrder();
            expect(submitOrder).toHaveBeenLastCalledWith(expect.objectContaining({
                symbol: `X:${coin}-USD`, transactionType: side, instrumentType: 'CRYPTO',
            }));
        }
    });

    it('prepares a currency holding from another market and prevents overselling', () => {
        component.state.holdings.set([{
            clientId: 'client-1', symbol: 'EUR', instrument: 'CASH',
            quantity: '5', avgBuyPrice: '1', currentValue: '5',
        }]);
        component.prepareTrade('EUR', 'SELL', 'Euro', 'CASH');
        expect(getQuote).toHaveBeenCalledWith('FX:EURUSD');
        component.state.quantity.set(6);
        expect(component.state.validation()).toContain('5 units of EUR');
        component.submitOrder();
        expect(submitOrder).not.toHaveBeenCalled();
    });

    it('preserves equity symbols and instrument types', () => {
        component.selectSymbol('AAPL');
        component.state.quantity.set(1);
        component.submitOrder();
        expect(getQuote).toHaveBeenCalledWith('AAPL');
        expect(submitOrder).toHaveBeenCalledWith(expect.objectContaining({
            symbol: 'AAPL', transactionType: 'BUY', instrumentType: 'EQUITY',
        }));
    });

    it('adds a rejection reason to the rejected timeline entry', () => {
        component.state.statusLog.set({
            SUBMITTED: { statusChangeTime: '2026-10-26T14:23:24.907875Z' },
            REJECTED: {
                statusChangeTime: '2026-10-26T14:23:24.926473Z',
                rejectionReason: 'Client does not own TSLA',
            },
        });

        expect(component.state.timeline()).toEqual(expect.arrayContaining([
            expect.objectContaining({
                status: 'REJECTED',
                detail: 'Client does not own TSLA',
                reached: true,
            }),
        ]));
        expect(component.state.timeline().some((entry) => entry.status === 'REJECTIONREASON')).toBe(false);
    });
});
