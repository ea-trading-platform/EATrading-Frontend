import { Injectable } from '@angular/core';
import { signal } from '@angular/core';

export interface WatchlistStock {
    symbol: string;
    name: string;
    price: number;
    changePercent: number;
    history: number[];
}

@Injectable({
    providedIn: 'root',
})
export class WatchlistService {
    private watchlistStocks = signal<WatchlistStock[]>([]);
    
    // Public getter for watchlist stocks
    readonly stocks = this.watchlistStocks.asReadonly();

    private calculateChangePercent(history: number[]): number {
        if (!history || history.length < 2) return 0;
        const firstPrice = history[0];
        const lastPrice = history[history.length - 1];
        return ((lastPrice - firstPrice) / firstPrice) * 100;
    }

    addStock(stock: WatchlistStock): void {
        const currentList = this.watchlistStocks();
        // Avoid duplicates
        if (!currentList.find(s => s.symbol === stock.symbol)) {
            const stockWithChange = {
                ...stock,
                changePercent: stock.changePercent ?? this.calculateChangePercent(stock.history)
            };
            this.watchlistStocks.set([...currentList, stockWithChange]);
            console.log('[WatchlistService] Added stock:', stock.symbol);
        }
    }

    removeStock(symbol: string): void {
        const currentList = this.watchlistStocks();
        this.watchlistStocks.set(currentList.filter(s => s.symbol !== symbol));
        console.log('[WatchlistService] Removed stock:', symbol);
    }

    isInWatchlist(symbol: string): boolean {
        return this.watchlistStocks().some(s => s.symbol === symbol);
    }

    clearWatchlist(): void {
        this.watchlistStocks.set([]);
    }
}
