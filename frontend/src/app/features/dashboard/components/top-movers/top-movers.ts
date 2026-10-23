import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { MarketMoversResponse } from '../../../../core/models/trading.models';
import { MarketDataService } from '../../../../core/services/market-data.service';
import { StockCardComponent } from '../stock-card/stock-card';

@Component({
    selector: 'app-top-movers',
    standalone: true,
    imports: [StockCardComponent],
    templateUrl: './top-movers.html',
    styleUrls: ['./top-movers.css'],
})
export class TopMoversComponent implements OnInit {
    private readonly marketDataService = inject(MarketDataService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly marketMovers = signal<MarketMoversResponse | null>(null);

    readonly isLoading = signal(true);
    readonly error = signal<string | null>(null);
    readonly isShowingGainers = signal(true);
    readonly unavailableSymbols = computed(() => this.marketMovers()?.unavailableSymbols ?? []);
    readonly movers = computed(() => {
        const data = this.marketMovers();
        return (this.isShowingGainers() ? data?.gainers : data?.losers) ?? [];
    });

    ngOnInit(): void {
        this.loadMovers();
        interval(5000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.isShowingGainers.update((showing) => !showing);
        });
    }

    loadMovers(): void {
        this.isLoading.set(true);
        this.error.set(null);
        this.marketDataService.getMarketMovers()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (data) => {
                    this.marketMovers.set(data);
                    this.isLoading.set(false);
                },
                error: (error) => {
                    console.error('[TopMovers] Failed to load market movers:', error);
                    this.error.set('Unable to load daily movers. Please try again.');
                    this.isLoading.set(false);
                },
            });
    }
}
