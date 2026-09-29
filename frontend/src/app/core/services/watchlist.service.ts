import { Injectable, inject, signal } from '@angular/core';
import { StockQuote } from '../models/trading.models';
import { MarketDataService } from './market-data.service';

/**
 * Shared service for managing the user's stock watchlist.
 * Provides reactive watchlist state and persistent storage via localStorage.
 */
@Injectable({ providedIn: 'root' })
export class WatchlistService {
    private readonly marketDataService = inject(MarketDataService);

    /**
     * Current watchlist of stocks
     */
    readonly watchlist = signal<StockQuote[]>([]);

    /**
     * Computed set of symbols in watchlist for quick lookup
     */
    readonly symbols = signal<Set<string>>(new Set());

    /**
     * Loading state
     */
    readonly isLoading = signal(false);

    /**
     * Error message if any
     */
    readonly error = signal<string | null>(null);

    constructor() {
        this.loadWatchlist();
    }

    /**
     * Add a stock to the watchlist
     */
    add(quote: StockQuote): void {
        const current = this.watchlist();
        const exists = current.some(s => s.symbol === quote.symbol);

        if (!exists) {
            const updated = [...current, quote];
            this.watchlist.set(updated);
            this.updateSymbols();
            this.save();
        }
    }

    /**
     * Remove a stock from the watchlist
     */
    remove(symbol: string): void {
        const updated = this.watchlist().filter(s => s.symbol !== symbol);
        this.watchlist.set(updated);
        this.updateSymbols();
        this.save();
    }

    /**
     * Check if a symbol is in the watchlist
     */
    has(symbol: string): boolean {
        return this.symbols().has(symbol);
    }

    /**
     * Load watchlist from localStorage and refresh quotes
     */
    private loadWatchlist(): void {
        this.isLoading.set(true);
        const saved = localStorage.getItem('ea_watchlist');

        if (saved) {
            try {
                const symbols: string[] = JSON.parse(saved);
                if (symbols.length > 0) {
                    this.loadSymbols(symbols);
                } else {
                    this.isLoading.set(false);
                }
            } catch (e) {
                console.error('Failed to load watchlist', e);
                this.error.set('Failed to load watchlist');
                this.isLoading.set(false);
            }
        } else {
            this.isLoading.set(false);
        }
    }

    /**
     * Load quotes for multiple symbols
     */
    private loadSymbols(symbols: string[]): void {
        const quotes: StockQuote[] = [];
        let loaded = 0;

        symbols.forEach(symbol => {
            this.marketDataService.loadQuote(symbol).subscribe({
                next: () => {
                    const quote = this.marketDataService.currentQuote();
                    if (quote) {
                        quotes.push(quote);
                    }
                    loaded++;
                    if (loaded === symbols.length) {
                        this.watchlist.set(quotes);
                        this.updateSymbols();
                        this.isLoading.set(false);
                    }
                },
                error: (err) => {
                    console.error(`Failed to load quote for ${symbol}`, err);
                    loaded++;
                    if (loaded === symbols.length) {
                        this.watchlist.set(quotes);
                        this.updateSymbols();
                        this.isLoading.set(false);
                    }
                }
            });
        });
    }

    /**
     * Update the symbols set for quick lookup
     */
    private updateSymbols(): void {
        this.symbols.set(new Set(this.watchlist().map(s => s.symbol)));
    }

    /**
     * Save watchlist symbols to localStorage
     */
    private save(): void {
        const symbols = this.watchlist().map(s => s.symbol);
        localStorage.setItem('ea_watchlist', JSON.stringify(symbols));
    }
}
