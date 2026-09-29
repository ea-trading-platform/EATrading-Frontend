import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarketDataService } from '../../../../../core/services/market-data.service';
import { WatchlistService } from '../../../../../core/services/watchlist.service';
import { StockQuote, Candle } from '../../../../../core/models/trading.models';

interface StockDetail {
    quote: StockQuote;
    candles: Candle[];
}

@Component({
    selector: 'app-stock-search',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './stock-search.html',
    styleUrls: ['./stock-search.css', '../../../styles/dashboard.css'],
    styles: [`:host { display: block; }`],
})
export class StockSearch implements OnInit {
    private readonly marketDataService = inject(MarketDataService);
    protected readonly watchlistService = inject(WatchlistService);

    // Search and modal state
    protected readonly isOpen = signal(false);
    protected readonly query = signal('');
    protected readonly selectedStock = signal<StockDetail | null>(null);
    protected readonly showDetailModal = signal(false);
    protected readonly isLoading = signal(false);
    protected readonly error = signal<string | null>(null);

    // Suggested symbols
    private readonly suggestedSymbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA'];
    protected readonly filteredSymbols = computed(() => {
        const term = this.query().trim().toUpperCase();
        if (!term) return this.suggestedSymbols;
        return this.suggestedSymbols.filter(s => s.includes(term));
    });

    // Expose watchlist from service
    protected readonly watchlist = computed(() => this.watchlistService.watchlist());
    protected readonly watchlistSymbols = computed(() => this.watchlistService.symbols());

    ngOnInit(): void {
        // Watchlist is automatically loaded by WatchlistService
    }

    open(): void {
        this.isOpen.set(true);
        this.query.set('');
        this.selectedStock.set(null);
        this.showDetailModal.set(false);
        this.error.set(null);
    }

    close(): void {
        this.isOpen.set(false);
        this.showDetailModal.set(false);
    }

    async searchStock(symbol: string): Promise<void> {
        const sym = symbol.trim().toUpperCase();
        if (!sym) return;

        this.isLoading.set(true);
        this.error.set(null);

        this.marketDataService.loadQuote(sym).subscribe({
            next: () => {
                const quote = this.marketDataService.currentQuote();
                if (!quote) {
                    this.error.set('Stock not found');
                    this.isLoading.set(false);
                    return;
                }

                this.marketDataService.loadCandles(sym, {}).subscribe({
                    next: () => {
                        const candleResp = this.marketDataService.currentCandles();
                        const candles = candleResp?.candles || [];
                        this.selectedStock.set({ quote, candles });
                        this.showDetailModal.set(true);
                        this.isLoading.set(false);
                    },
                    error: () => {
                        this.selectedStock.set({ quote, candles: [] });
                        this.showDetailModal.set(true);
                        this.isLoading.set(false);
                    }
                });
            },
            error: () => {
                this.error.set(`Stock "${sym}" not found`);
                this.isLoading.set(false);
            }
        });
    }

    addToWatchlist(quote: StockQuote): void {
        this.watchlistService.add(quote);
    }

    removeFromWatchlist(symbol: string): void {
        this.watchlistService.remove(symbol);
    }

    closeDetailModal(): void {
        this.showDetailModal.set(false);
    }
}
