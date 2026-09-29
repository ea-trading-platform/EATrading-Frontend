import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarketDataService } from '../../../../core/services/market-data.service';
import { StockQuote, Candle, CandleQuery } from '../../../../core/models/trading.models';

@Component({
    selector: 'app-market-data-viewer',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './market-data-viewer.html',
    styleUrl: './market-data-viewer.css',
})
export class MarketDataViewerComponent implements OnInit {
    private readonly marketDataService = inject(MarketDataService);

    // Signals
    symbol = signal<string>('AAPL');
    quote = signal<StockQuote | null>(null);
    candles = signal<Candle[]>([]);
    isLoading = signal(false);
    error = signal<string | null>(null);

    ngOnInit(): void {
        this.loadMarketData();
    }

    loadMarketData(): void {
        const sym = this.symbol();
        if (!sym.trim()) {
            this.error.set('Please enter a symbol');
            return;
        }

        this.isLoading.set(true);
        this.error.set(null);

        // Load quote
        this.marketDataService.loadQuote(sym).subscribe({
            next: () => {
                this.quote.set(this.marketDataService.currentQuote());
            },
            error: (err) => {
                this.error.set(`Failed to load quote: ${err?.message || 'Unknown error'}`);
            },
        });

        // Load candles (30 days)
        const candleQuery: CandleQuery = {};
        this.marketDataService.loadCandles(sym, candleQuery).subscribe({
            next: () => {
                const response = this.marketDataService.currentCandles();
                if (response && response.candles) {
                    this.candles.set(response.candles);
                }
                this.isLoading.set(false);
            },
            error: (err) => {
                this.error.set(`Failed to load candles: ${err?.message || 'Unknown error'}`);
                this.isLoading.set(false);
            },
        });
    }

    onSymbolChange(newSymbol: string): void {
        this.symbol.set(newSymbol.toUpperCase());
    }

    searchSymbol(): void {
        this.loadMarketData();
    }

    clearError(): void {
        this.error.set(null);
    }
}
