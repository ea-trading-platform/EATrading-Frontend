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
import { StockSearch } from '../dashboard/client-dashboard/components/stock-search/stock-search';
import { StockTicker } from '../dashboard/components/stock-ticker/stock-ticker';
import { StockTickerData } from '../dashboard/interfaces/stock-ticker.interface';
import { TradeDataGrid, TransactOrderRow, TransactPositionRow } from './trade-data-grid';

ModuleRegistry.registerModules([AllCommunityModule]);

type Market = 'Equities' | 'Crypto' | 'Forex';
type TradeDataTab = 'positions' | 'open-orders' | 'history';

const TICKER_SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'UBER', 'PYPL'];

@Component({
    imports: [CurrencyPipe, DecimalPipe, FormsModule, AgCharts, TopBar, WatchlistComponent, StockSearch, StockTicker, TradeDataGrid],
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
    protected readonly isRefreshing = signal(false);
    protected readonly orderMessage = signal<string | null>(null);
    protected readonly orderError = signal<string | null>(null);
    protected readonly activeDataTab = signal<TradeDataTab>('positions');
    protected readonly holdings = signal<Holding[]>([]);
    protected readonly orders = signal<Order[]>([]);
    protected readonly stocksSignal = signal<StockTickerData[]>([]);
    protected readonly suggestedSymbols: Record<Market, string[]> = {
        Equities: ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA'],
        Crypto: ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE'],
        Forex: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF'],
    };
    protected readonly filteredSuggestions = computed(() => {
        const term = this.symbol().trim().toUpperCase();
        const suggestions = this.suggestedSymbols[this.activeMarket()];
        return term
            ? suggestions.filter((suggestion) => suggestion.includes(term))
            : suggestions;
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
    protected readonly orderRows = computed<TransactOrderRow[]>(() => this.orders().map((order) => ({
        id: order.id,
        trackingId: order.trackingId,
        orderType: order.orderType,
        symbol: order.symbol,
        quantity: order.quantity,
        status: order.status,
        executedAt: order.executedAt,
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

    protected readonly ownedQuantity = computed(() => {
        const selectedSymbol = this.marketSymbol();
        const holding = this.holdings().find((item) => this.marketSymbol(item.symbol) === selectedSymbol);
        return Number(holding?.quantity) || 0;
    });
    protected readonly quantityValidationError = computed(() => {
        const requestedQuantity = Number(this.quantity());
        if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
            return null;
        }

        if (this.orderSide() === 'SELL' && requestedQuantity > this.ownedQuantity()) {
            return `You can sell at most ${this.ownedQuantity()} shares of ${this.symbol()}.`;
        }

        if (this.orderSide() === 'BUY' && this.quote() && this.estimatedCost() > this.availableToTrade()) {
            return `This order costs ${this.estimatedCost().toFixed(2)}, but only ${this.availableToTrade().toFixed(2)} is available to trade.`;
        }

        return null;
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
        this.refreshData();
    }

    refreshData(): void {
        if (this.isRefreshing()) {
            return;
        }

        this.isRefreshing.set(true);
        const clientId = this.auth.getClientId();
        const requests: Array<ReturnType<typeof this.trading.loadClient>> = [];

        if (clientId) {
            requests.push(this.trading.loadClient(clientId));
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

        this.fetchTickerData();
        if (this.symbol()) {
            this.search();
        }

        if (requests.length === 0) {
            this.isRefreshing.set(false);
            return;
        }

        requests[0].subscribe({
            next: (account) => this.account.set(account),
            error: (error) => console.error('Error refreshing account:', error),
            complete: () => this.isRefreshing.set(false),
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
        this.symbol.set(this.displaySymbol(symbol));
        this.instrumentName.set(name);
        this.search();
    }

    prepareTrade(symbol: string, side: 'BUY' | 'SELL', name = symbol): void {
        this.orderSide.set(side);
        this.selectSymbol(symbol, name);
    }

    submitOrder(): void {
        const clientId = this.auth.getClientId();
        const requestedSymbol = this.marketSymbol();
        const requestedQuantity = Number(this.quantity());

        if (!clientId || !requestedSymbol || !Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
            this.orderError.set('Select a symbol and enter a valid quantity before submitting.');
            this.orderMessage.set(null);
            return;
        }

        if (this.quantityValidationError()) {
            this.orderError.set(this.quantityValidationError());
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
                window.setTimeout(() => this.refreshData(), 1000);
            },
            error: () => {
                this.isSubmittingOrder.set(false);
                this.orderError.set('Order could not be submitted. Please try again.');
            },
        });
    }

    private marketSymbol(value = this.symbol()): string {
        const input = value.trim().toUpperCase();
        if (!input) {
            return '';
        }

        if (this.activeMarket() === 'Crypto') {
            const base = input.replace(/^X:/, '').replace(/-USD$/, '');
            return `X:${base}-USD`;
        }

        if (this.activeMarket() === 'Forex') {
            return `FX:${input.replace(/^FX:/, '')}`;
        }

        return input;
    }

    private displaySymbol(value: string): string {
        const input = value.trim().toUpperCase();
        if (this.activeMarket() === 'Crypto') {
            return input.replace(/^X:/, '').replace(/-USD$/, '');
        }

        if (this.activeMarket() === 'Forex') {
            return input.replace(/^FX:/, '');
        }

        return input;
    }

    private loadPortfolioSummary(clientId: string): void {
        this.api.getPortfolioSummary(clientId).subscribe({
            next: (portfolio) => this.portfolio.set(portfolio),
            error: (error) => console.error('Error fetching portfolio summary:', error),
        });
    }

    private fetchTickerData(): void {
        const quoteRequests = TICKER_SYMBOLS.map((symbol) => this.api.getQuote(symbol));
        const candleRequests = TICKER_SYMBOLS.map((symbol) => this.api.getCandles(symbol));

        forkJoin({
            quotes: forkJoin(quoteRequests),
            candles: forkJoin(candleRequests),
        }).subscribe({
            next: ({ quotes, candles }) => {
                this.stocksSignal.set(TICKER_SYMBOLS.map((symbol, index) => {
                    const quote = quotes[index];
                    const response = candles[index] as CandleResponse;
                    const candleList = response.data?.candles ?? response.candles ?? [];
                    const priceHistory = candleList.map((candle) => candle.close).slice(-8);

                    return {
                        symbol,
                        percentChange: quote?.changePercent ?? 0,
                        priceHistory: priceHistory.length > 0 ? priceHistory : [quote?.price ?? 0],
                    };
                }));
            },
            error: (error) => {
                console.error('Error fetching ticker data:', error);
                this.stocksSignal.set([]);
            },
        });
    }

    search(): void {
        const requestedSymbol = this.marketSymbol();
        if (!requestedSymbol) {
            this.error.set('Enter a symbol to view market data.');
            return;
        }

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
