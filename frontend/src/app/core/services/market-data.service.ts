import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, tap } from 'rxjs';
import { ApiService } from './api.service';
import {
    StockQuote,
    CandleResponse,
    SpreadInfo,
    PriceChange,
    PriceData,
    CacheStats,
    CandleQuery
} from '../models/trading.models';

/**
 * Specialized service for market data operations.
 * Provides convenience methods, caching, and error handling for stock quotes,
 * historical data, and market health checks.
 */
@Injectable({ providedIn: 'root' })
export class MarketDataService {
    private readonly apiService = inject(ApiService);

    // ========================================================================
    // SIGNALS FOR REACTIVE STATE
    // ========================================================================

    /**
     * Currently loaded quote
     */
    currentQuote = signal<StockQuote | null>(null);

    /**
     * Historical candles for the current symbol
     */
    currentCandles = signal<CandleResponse | null>(null);

    /**
     * Market health status
     */
    marketHealth = signal<string | null>(null);

    /**
     * Loading state
     */
    isLoading = signal(false);

    /**
     * Error message if any
     */
    error = signal<string | null>(null);

    // ========================================================================
    // PUBLIC METHODS
    // ========================================================================

    /**
     * Fetch and cache a stock quote
     * Updates currentQuote signal on success
     */
    loadQuote(symbol: string): Observable<StockQuote> {
        this.isLoading.set(true);
        this.error.set(null);

        return this.apiService.getQuote(symbol).pipe(
            tap((quote) => {
                this.currentQuote.set(quote);
                this.isLoading.set(false);
            }),
            catchError((err) => {
                this.error.set(err?.message || 'Failed to load quote');
                this.isLoading.set(false);
                throw err;
            })
        );
    }

    /**
     * Fetch stock quote without updating signal
     */
    getQuote(symbol: string): Observable<StockQuote> {
        return this.apiService.getQuote(symbol);
    }

    /**
     * Fetch and cache historical candles
     * Updates currentCandles signal on success
     */
    loadCandles(symbol: string, query?: CandleQuery): Observable<CandleResponse> {
        this.isLoading.set(true);
        this.error.set(null);

        return this.apiService.getCandles(symbol, query).pipe(
            tap((candles) => {
                this.currentCandles.set(candles);
                this.isLoading.set(false);
            }),
            catchError((err) => {
                this.error.set(err?.message || 'Failed to load candles');
                this.isLoading.set(false);
                throw err;
            })
        );
    }

    /**
     * Fetch historical candles without updating signal
     */
    getCandles(symbol: string, query?: CandleQuery): Observable<CandleResponse> {
        return this.apiService.getCandles(symbol, query);
    }

    /**
     * Get bid-ask spread for a stock
     */
    getSpread(symbol: string): Observable<SpreadInfo> {
        return this.apiService.getSpread(symbol);
    }

    /**
     * Get price change metrics
     */
    getPriceChange(symbol: string): Observable<PriceChange> {
        return this.apiService.getPriceChange(symbol);
    }

    /**
     * Get current price only
     */
    getCurrentPrice(symbol: string): Observable<PriceData> {
        return this.apiService.getCurrentPrice(symbol);
    }

    /**
     * Fetch and cache market health status
     */
    checkMarketHealth(): Observable<string> {
        return this.apiService.getMarketHealth().pipe(
            tap((health) => {
                this.marketHealth.set(health);
            }),
            catchError((err) => {
                this.error.set(err?.message || 'Failed to check market health');
                throw err;
            })
        );
    }

    /**
     * Get market API usage statistics
     */
    getMarketUsage(): Observable<unknown> {
        return this.apiService.getMarketUsage();
    }

    /**
     * Clear the server-side quote cache
     */
    clearCache(): Observable<{ status: string; message: string }> {
        return this.apiService.clearMarketCache().pipe(
            tap(() => {
                // Clear local signals as well
                this.currentQuote.set(null);
                this.currentCandles.set(null);
            }),
            catchError((err) => {
                this.error.set(err?.message || 'Failed to clear cache');
                throw err;
            })
        );
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): Observable<CacheStats> {
        return this.apiService.getMarketCacheStats();
    }

    /**
     * Clear local error state
     */
    clearError(): void {
        this.error.set(null);
    }
}
