import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AgCharts } from 'ag-charts-angular';
import {
    AgCartesianChartOptions,
    AgLineSeriesOptions,
    AllCommunityModule,
    ModuleRegistry,
} from 'ag-charts-community';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { TradingService } from '../../core/services/trading.service';
import { Candle, CandleResponse, Client, StockQuote } from '../../core/models/trading.models';
import { TopBar, TopBarNavItem } from '../components/top-bar/top-bar';
import { WatchlistComponent } from '../dashboard/components/watchlist/watchlist';

ModuleRegistry.registerModules([AllCommunityModule]);

type Market = 'Equities' | 'Crypto' | 'Forex';

@Component({
    imports: [CurrencyPipe, DecimalPipe, FormsModule, AgCharts, TopBar, WatchlistComponent],
    selector: 'app-transact',
    standalone: true,
    styleUrl: './transact.css',
    templateUrl: './transact.html',
})
export class Transact implements OnInit {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly api = inject(ApiService);
    private readonly trading = inject(TradingService);

    protected readonly navItems: readonly TopBarNavItem[] = [
        { label: 'Dashboard', route: '/dashboard' },
        { label: 'Transact', route: '/transact' },
        { label: 'News', route: '/news' },
    ];

    protected readonly markets: readonly Market[] = ['Equities', 'Crypto', 'Forex'];
    protected readonly activeMarket = signal<Market>('Equities');
    protected readonly symbol = signal('');
    protected readonly quote = signal<StockQuote | null>(null);
    protected readonly candles = signal<Candle[]>([]);
    protected readonly isLoading = signal(false);
    protected readonly error = signal<string | null>(null);
    protected readonly account = signal<Client | null>(null);
    protected readonly orderSide = signal<'BUY' | 'SELL'>('BUY');
    protected readonly orderType = signal<'MARKET'>('MARKET');
    protected readonly quantity = signal<number | null>(null);
    protected readonly availableToTrade = computed(() => Number(this.account()?.totalBalance) || 0);
    protected readonly estimatedCost = computed(() => {
        const price = Number(this.quote()?.price) || 0;
        const shares = Number(this.quantity()) || 0;
        return price * shares;
    });

    protected readonly chartOptions = computed<AgCartesianChartOptions>(() => ({
        background: { fill: 'transparent' },
        padding: { top: 12, right: 20, bottom: 12, left: 12 },
        series: [{
            type: 'line',
            data: this.candles(),
            xKey: 'timestamp',
            xName: 'Date',
            yKey: 'close',
            yName: 'Close',
            stroke: '#4ecccc',
            strokeWidth: 2.5,
            marker: { enabled: true, size: 4, fill: '#4ecccc' },
            tooltip: { enabled: true },
        } as AgLineSeriesOptions],
        axes: {
            x: { type: 'category', label: { color: 'rgba(255, 255, 255, 0.6)' } },
            y: {
                type: 'number',
                label: { color: 'rgba(255, 255, 255, 0.6)', format: '$#{0.2f}' },
                gridLine: { style: [{ stroke: 'rgba(255, 255, 255, 0.1)', lineDash: [4, 2] }] },
            },
        },
        legend: { enabled: false },
    }));

    ngOnInit(): void {
        const clientId = this.auth.getClientId();
        if (!clientId) {
            return;
        }

        this.trading.loadClient(clientId).subscribe({
            next: (account) => this.account.set(account),
            error: (error) => console.error('Error fetching account:', error),
        });
    }

    selectMarket(market: Market): void {
        this.activeMarket.set(market);
        this.symbol.set('');
        this.quote.set(null);
        this.candles.set([]);
        this.error.set(null);
        this.quantity.set(null);
    }

    search(): void {
        const requestedSymbol = this.symbol().trim().toUpperCase();
        if (!requestedSymbol) {
            this.error.set('Enter a symbol to view market data.');
            return;
        }

        this.symbol.set(requestedSymbol);
        this.isLoading.set(true);
        this.error.set(null);
        this.quote.set(null);
        this.candles.set([]);

        forkJoin({
            quote: this.api.getQuote(requestedSymbol),
            candles: this.api.getCandles(requestedSymbol),
        }).subscribe({
            next: ({ quote, candles }) => {
                const response = candles as CandleResponse;
                const candleData = response.data ?? response;
                this.quote.set(quote);
                this.quantity.set(null);
                this.candles.set(candleData.candles.map((candle) => ({
                    ...candle,
                    timestamp: candle.timestamp ?? candle.date ?? '',
                })));
                this.isLoading.set(false);
            },
            error: () => {
                this.error.set(`Unable to load ${requestedSymbol}. Check the symbol and try again.`);
                this.isLoading.set(false);
            },
        });
    }

    async logout(): Promise<void> {
        await this.auth.signOut();
        this.router.navigateByUrl('/');
    }
}
