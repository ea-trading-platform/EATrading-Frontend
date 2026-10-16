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
import { Candle, CandleResponse, Client, Holding, Order, OrderRequest, PortfolioSummary, StockQuote } from '../../core/models/trading.models';
import { TopBar, TopBarNavItem } from '../components/top-bar/top-bar';
import { WatchlistComponent } from '../dashboard/components/watchlist/watchlist';

ModuleRegistry.registerModules([AllCommunityModule]);

type Market = 'Equities' | 'Crypto' | 'Forex';
type TradeDataTab = 'positions' | 'open-orders' | 'history';

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
    protected readonly instrumentName = signal('');
    protected readonly quote = signal<StockQuote | null>(null);
    protected readonly candles = signal<Candle[]>([]);
    protected readonly isLoading = signal(false);
    protected readonly error = signal<string | null>(null);
    protected readonly account = signal<Client | null>(null);
    protected readonly portfolio = signal<PortfolioSummary | null>(null);
    protected readonly orderSide = signal<'BUY' | 'SELL'>('BUY');
    protected readonly quantity = signal<number | null>(null);
    protected readonly isSubmittingOrder = signal(false);
    protected readonly orderMessage = signal<string | null>(null);
    protected readonly orderError = signal<string | null>(null);
    protected readonly activeDataTab = signal<TradeDataTab>('positions');
    protected readonly holdings = signal<Holding[]>([]);
    protected readonly orders = signal<Order[]>([]);
    protected readonly suggestedSymbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA'];
    protected readonly filteredSuggestions = computed(() => {
        const term = this.symbol().trim().toUpperCase();
        return term
            ? this.suggestedSymbols.filter((suggestion) => suggestion.includes(term))
            : this.suggestedSymbols;
    });
    protected readonly positions = computed(() => this.holdings().map((holding) => ({
        symbol: holding.symbol,
        name: holding.name ?? holding.symbol,
        quantity: Number(holding.quantity) || 0,
        averageCost: Number(holding.avgBuyPrice) || 0,
        currentPrice: Number(holding.currentValue) && Number(holding.quantity)
            ? Number(holding.currentValue) / Number(holding.quantity)
            : 0,
        value: Number(holding.currentValue) || 0,
    })));
    protected readonly openOrders = computed(() => this.orders().filter((order) =>
        order.status === 'PENDING' || order.status === 'SUBMITTED'));
    protected readonly orderHistory = computed(() => this.orders().filter((order) =>
        order.status !== 'PENDING' && order.status !== 'SUBMITTED'));
    protected readonly availableToTrade = computed(() => {
        const availableCash = Number(this.portfolio()?.availableCashUsd);
        return Number.isFinite(availableCash) ? availableCash : Number(this.account()?.totalBalance) || 0;
    });
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
        this.loadPortfolioSummary(clientId);
        this.trading.loadHoldings(clientId).subscribe({
            next: (holdings) => this.holdings.set(holdings),
            error: (error) => console.error('Error fetching holdings:', error),
        });
        this.trading.loadOrders(clientId).subscribe({
            next: (orders) => this.orders.set(orders),
            error: (error) => console.error('Error fetching orders:', error),
        });
    }

    selectMarket(market: Market): void {
        this.activeMarket.set(market);
        this.symbol.set('');
        this.quote.set(null);
        this.candles.set([]);
        this.error.set(null);
        this.quantity.set(null);
        this.orderMessage.set(null);
        this.orderError.set(null);
    }

    selectSymbol(symbol: string, name = symbol): void {
        this.symbol.set(symbol.toUpperCase());
        this.instrumentName.set(name);
        this.search();
    }

    prepareTrade(symbol: string, side: 'BUY' | 'SELL', name = symbol): void {
        this.orderSide.set(side);
        this.selectSymbol(symbol, name);
    }

    submitOrder(): void {
        const clientId = this.auth.getClientId();
        const requestedSymbol = this.symbol().trim().toUpperCase();
        const requestedQuantity = Number(this.quantity());

        if (!clientId || !requestedSymbol || !Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
            this.orderError.set('Select a symbol and enter a valid quantity before submitting.');
            this.orderMessage.set(null);
            return;
        }

        const request: OrderRequest = {
            clientId,
            symbol: requestedSymbol,
            name: this.instrumentName() || requestedSymbol,
            quantity: requestedQuantity,
            transactionType: this.orderSide(),
        };

        this.isSubmittingOrder.set(true);
        this.orderMessage.set(null);
        this.orderError.set(null);

        this.trading.submitOrder(request).subscribe({
            next: (response) => {
                this.isSubmittingOrder.set(false);
                this.orderMessage.set(`${this.orderSide()} order for ${requestedSymbol} submitted. Tracking ID: ${response.trackingId}`);
                this.quantity.set(null);
                this.refreshAccountData(clientId);
            },
            error: () => {
                this.isSubmittingOrder.set(false);
                this.orderError.set('Order could not be submitted. Please try again.');
            },
        });
    }

    private refreshAccountData(clientId: string): void {
        this.trading.loadClient(clientId).subscribe({
            next: (account) => this.account.set(account),
            error: (error) => console.error('Error refreshing account:', error),
        });
        this.loadPortfolioSummary(clientId);
        this.trading.loadHoldings(clientId).subscribe({
            next: (holdings) => this.holdings.set(holdings),
            error: (error) => console.error('Error refreshing holdings:', error),
        });
        this.trading.loadOrders(clientId).subscribe({
            next: (orders) => this.orders.set(orders),
            error: (error) => console.error('Error refreshing orders:', error),
        });
    }

    private loadPortfolioSummary(clientId: string): void {
        this.api.getPortfolioSummary(clientId).subscribe({
            next: (portfolio) => this.portfolio.set(portfolio),
            error: (error) => console.error('Error fetching portfolio summary:', error),
        });
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
