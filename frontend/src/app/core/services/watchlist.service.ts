import { Injectable, inject, signal, effect } from '@angular/core';
import { StockQuote, WatchlistItemResponse } from '../models/trading.models';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

/**
 * Service for managing the user's stock watchlist.
 * Fetches and syncs watchlist with the backend API based on authenticated user.
 */
@Injectable({ providedIn: 'root' })
export class WatchlistService {
    private readonly apiService = inject(ApiService);
    private readonly authService = inject(AuthService);
    private loadedClientId: string | null = null;

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
        // Watch for user changes and reload watchlist when user logs in/out
        effect(() => {
            const clientId = this.authService.getClientId();
            if (clientId) {
                if (this.loadedClientId === clientId) {
                    return;
                }
                this.loadWatchlistFromServer(clientId);
            } else {
                // User logged out, clear watchlist
                this.watchlist.set([]);
                this.updateSymbols();
                this.loadedClientId = null;
            }
        });
    }

    /**
     * Add a stock to the user's watchlist
     */
    add(quote: StockQuote): void {
        const clientId = this.authService.getClientId();
        if (!clientId) {
            this.error.set('User not authenticated');
            return;
        }

        const current = this.watchlist();
        const exists = current.some(s => s.symbol === quote.symbol);

        if (!exists) {
            // Add to UI optimistically
            const updated = [...current, quote];
            this.watchlist.set(updated);
            this.updateSymbols();

            // Sync with backend
            this.apiService.addToWatchlist(clientId, quote.symbol).subscribe({
                next: (item) => {
                    const serverQuote = this.mapWatchlistItemToQuote(item);
                    this.watchlist.set(
                        this.watchlist().map((stock) =>
                            stock.symbol === serverQuote.symbol ? serverQuote : stock
                        )
                    );
                },
                error: (err) => {
                    console.error('Failed to add to watchlist', err);
                    this.error.set('Failed to add to watchlist');
                    // Revert
                    this.watchlist.set(current);
                    this.updateSymbols();
                }
            });
        }
    }

    /**
     * Remove a stock from the user's watchlist
     */
    remove(symbol: string): void {
        const clientId = this.authService.getClientId();
        if (!clientId) {
            this.error.set('User not authenticated');
            return;
        }

        const current = this.watchlist();
        const updated = current.filter(s => s.symbol !== symbol);

        // Remove from UI optimistically
        this.watchlist.set(updated);
        this.updateSymbols();

        // Sync with backend
        this.apiService.removeFromWatchlist(clientId, symbol).subscribe({
            error: (err) => {
                console.error('Failed to remove from watchlist', err);
                this.error.set('Failed to remove from watchlist');
                // Revert
                this.watchlist.set(current);
                this.updateSymbols();
            }
        });
    }

    /**
     * Check if a symbol is in the watchlist
     */
    has(symbol: string): boolean {
        return this.symbols().has(symbol);
    }

    /**
     * Load watchlist from server for the authenticated user
     */
    private loadWatchlistFromServer(clientId: string): void {
        if (!clientId || clientId.trim().length === 0) {
            this.error.set('Missing client id for watchlist request');
            this.watchlist.set([]);
            this.updateSymbols();
            this.isLoading.set(false);
            return;
        }

        this.isLoading.set(true);
        this.error.set(null);

        this.apiService.getWatchlist(clientId).subscribe({
            next: (items) => {
                const quotes = items.map((item) => this.mapWatchlistItemToQuote(item));
                this.watchlist.set(quotes);
                this.updateSymbols();
                this.loadedClientId = clientId;
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Failed to load watchlist', err);
                this.error.set('Failed to load watchlist');
                this.isLoading.set(false);
            }
        });
    }

    /**
     * Update the symbols set for quick lookup
     */
    private updateSymbols(): void {
        this.symbols.set(new Set(this.watchlist().map(s => s.symbol)));
    }

    private mapWatchlistItemToQuote(item: WatchlistItemResponse): StockQuote {
        return {
            symbol: item.symbol,
            price: item.currentPrice,
            bid: item.currentPrice,
            ask: item.currentPrice,
            asOf: item.timestamp,
            change: item.priceChange,
            changePercent: item.percentChange,
            currency: 'USD',
            marketState: 'REGULAR',
            previousClose: item.currentPrice - item.priceChange,
            spreadBps: 0,
        };
    }
}
