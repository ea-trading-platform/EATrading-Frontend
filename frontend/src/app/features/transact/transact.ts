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
    UnitTimeAxisModule,
} from 'ag-charts-community';
import { ColDef, GridOptions } from 'ag-grid-community';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { TradingService } from '../../core/services/trading.service';
import { Candle, CandleResponse, Client, Holding, Order, OrderRequest, OrderStatusLog, PortfolioSummary, StockQuote } from '../../core/models/trading.models';
import { TopBar, TopBarNavItem } from '../components/top-bar/top-bar';
import { WatchlistComponent } from '../dashboard/components/watchlist/watchlist';
import { StockSearch } from '../dashboard/client-dashboard/components/stock-search/stock-search';
import { StockTicker } from '../dashboard/components/stock-ticker/stock-ticker';
import { StockTickerData } from '../dashboard/interfaces/stock-ticker.interface';
import { DataGrid } from '../dashboard/components/data-grid/data-grid';

ModuleRegistry.registerModules([AllCommunityModule, UnitTimeAxisModule]);

type Market = 'Equities' | 'Crypto' | 'Forex';
type TradeDataTab = 'positions' | 'open-orders' | 'order-lookup';
type ChartRange = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';
type OrderStatusTimelineStep = {
    status: string;
    label: string;
    rawTimestamp: string | null;
    timestamp: string | null;
    reached: boolean;
    isCurrent: boolean;
};

const TICKER_SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'UBER', 'PYPL'];
const ORDER_TIMELINE_BASE_STATUSES = ['SUBMITTED', 'ACCEPTED', 'FILLED'] as const;

@Component({
    imports: [CurrencyPipe, DecimalPipe, FormsModule, AgCharts, TopBar, WatchlistComponent, StockSearch, StockTicker, DataGrid],
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
    protected readonly ranges: readonly ChartRange[] = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];
    protected readonly selectedRange = signal<ChartRange>('1M');
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
    protected readonly cancellingTrackingId = signal<string | null>(null);
    protected readonly isRefreshing = signal(false);
    protected readonly orderMessage = signal<string | null>(null);
    protected readonly orderError = signal<string | null>(null);
    protected readonly activeDataTab = signal<TradeDataTab>('positions');
    protected readonly copyError = signal<string | null>(null);
    protected readonly trackingIdSearch = signal('');
    protected readonly statusLogLoading = signal(false);
    protected readonly statusLogMessage = signal<string | null>(null);
    protected readonly statusLogError = signal<string | null>(null);
    protected readonly statusLog = signal<OrderStatusLog>({});
    protected readonly statusTimeline = computed<OrderStatusTimelineStep[]>(() => {
        const statusEntries = Object.entries(this.statusLog())
            .map(([status, timestamp]) => ({
                status: this.normalizeStatus(status),
                rawTimestamp: timestamp,
                parsedTimestamp: new Date(timestamp).getTime(),
            }))
            .sort((first, second) => first.parsedTimestamp - second.parsedTimestamp);

        const statusTimestampMap = new Map<string, string>();
        statusEntries.forEach((entry) => {
            statusTimestampMap.set(entry.status, entry.rawTimestamp);
        });

        const reachedStatuses = new Set(statusEntries.map((entry) => entry.status));
        const lastReachedStatus = statusEntries.length > 0
            ? statusEntries[statusEntries.length - 1].status
            : null;

        const statusesInTimeline: string[] = [...ORDER_TIMELINE_BASE_STATUSES];

        statusEntries.forEach((entry) => {
            if (!statusesInTimeline.includes(entry.status)) {
                statusesInTimeline.push(entry.status);
            }
        });

        return statusesInTimeline.map((status) => {
            const rawTimestamp = statusTimestampMap.get(status) ?? null;
            return {
                status,
                label: this.formatStatusLabel(status),
                rawTimestamp,
                timestamp: rawTimestamp ? this.formatStatusTimestamp(rawTimestamp) : null,
                reached: reachedStatuses.has(status),
                isCurrent: reachedStatuses.has(status) && lastReachedStatus === status,
            };
        });
    });
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
    protected readonly gridRows = computed(() => this.activeDataTab() === 'positions'
        ? this.positions()
        : this.openOrders());
    protected readonly gridOptions = computed<GridOptions<any>>(() => ({
        domLayout: 'autoHeight',
        suppressCellFocus: true,
    }));
    protected readonly gridColumns = computed<ColDef<any>[]>(() =>
        this.activeDataTab() === 'positions' ? this.positionColumns() : this.orderColumns(),
    );
    protected readonly openOrders = computed(() => this.orders().filter((order) =>
        order.status === 'PENDING' || order.status === 'SUBMITTED' || order.status === 'ACCEPTED'));
    protected readonly availableToTrade = computed(() => {
        const availableCash = Number(this.portfolio()?.availableCashUsd);
        return Number.isFinite(availableCash) ? availableCash : Number(this.account()?.totalBalance) || 0;
    });
    protected readonly estimatedCost = computed(() => {
        const price = Number(this.quote()?.price) || 0;
        const shares = Number(this.quantity()) || 0;
        return price * shares;
    });
    protected readonly quoteChange = computed(() => {
        const quote = this.quote();
        const prices = this.candles()
            .map((candle) => Number(candle.adjclose ?? candle.close))
            .filter((price) => Number.isFinite(price));

        if (prices.length >= 2) {
            return prices[prices.length - 1] - prices[0];
        }

        if (!quote) {
            return 0;
        }

        const change = Number(quote.price) - Number(quote.previousClose);
        return Number.isFinite(change) ? change : Number(quote.change) || 0;
    });
    protected readonly quoteChangePercent = computed(() => {
        const quote = this.quote();
        const prices = this.candles()
            .map((candle) => Number(candle.adjclose ?? candle.close))
            .filter((price) => Number.isFinite(price));

        if (prices.length >= 2 && prices[0] !== 0) {
            return (this.quoteChange() / prices[0]) * 100;
        }

        const previousClose = Number(quote?.previousClose);
        if (!quote || !Number.isFinite(previousClose) || previousClose === 0) {
            return Number(quote?.changePercent) || 0;
        }

        return (this.quoteChange() / previousClose) * 100;
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
            tooltip: {
                enabled: true,
                renderer: (params: any) => {
                    const date = new Date(params.datum.timestamp).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                    });
                    const close = new Intl.NumberFormat('en-US', {
                        style: 'currency', currency: this.quote()?.currency ?? 'USD', maximumFractionDigits: 2,
                    }).format(Number(params.datum.close) || 0);
                    return `${date}<br/>Close: ${close}`;
                },
            },
        } as AgLineSeriesOptions],
        axes: {
            x: { type: 'unit-time', label: { color: 'rgba(255, 255, 255, 0.6)' } },
            y: {
                type: 'number',
                label: { color: 'rgba(255, 255, 255, 0.6)', format: '$#,##0.00' },
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

    private positionColumns(): ColDef<any>[] {
        const currencyFormatter = (params: { value: number }): string =>
            new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(params.value ?? 0);

        return [
            { field: 'symbol', headerName: 'Symbol', minWidth: 110 },
            { field: 'name', headerName: 'Name', minWidth: 170, flex: 1 },
            { field: 'quantity', headerName: 'Quantity', minWidth: 110 },
            { field: 'averageCost', headerName: 'Average cost', minWidth: 135, valueFormatter: currencyFormatter },
            { field: 'currentPrice', headerName: 'Current price', minWidth: 135, valueFormatter: currencyFormatter },
            { field: 'value', headerName: 'Value', minWidth: 125, valueFormatter: currencyFormatter },
            {
                colId: 'actions', headerName: 'Actions', minWidth: 155, sortable: false,
                cellRenderer: (params: { data: { symbol: string; name: string } }) => {
                    const container = document.createElement('div');
                    container.style.display = 'flex';
                    container.style.gap = '0.4rem';
                    for (const side of ['BUY', 'SELL'] as const) {
                        const button = document.createElement('button');
                        button.type = 'button';
                        button.textContent = side === 'BUY' ? 'Buy' : 'Sell';
                        button.style.border = '0';
                        button.style.borderRadius = '0.3rem';
                        button.style.padding = '0.35rem 0.6rem';
                        button.style.color = '#08131c';
                        button.style.cursor = 'pointer';
                        button.style.fontWeight = '800';
                        button.style.background = side === 'BUY' ? '#65d6a0' : '#e06c75';
                        button.addEventListener('click', (event) => {
                            event.stopPropagation();
                            this.prepareTrade(params.data.symbol, side, params.data.name);
                        });
                        container.appendChild(button);
                    }
                    return container;
                },
            },
        ];
    }

    private orderColumns(): ColDef<any>[] {
        return [
            {
                field: 'trackingId',
                headerName: 'Tracking ID',
                minWidth: 220,
                cellRenderer: (params: { value?: string }) => {
                    const button = document.createElement('button');
                    const trackingId = params.value ?? '';
                    button.type = 'button';
                    button.textContent = trackingId || 'Unavailable';
                    button.title = trackingId ? 'Copy tracking ID' : 'Tracking ID unavailable';
                    button.disabled = !trackingId;
                    button.style.border = '0';
                    button.style.background = 'transparent';
                    button.style.color = 'inherit';
                    button.style.cursor = trackingId ? 'copy' : 'default';
                    button.style.padding = '0';
                    button.addEventListener('click', (event) => {
                        event.stopPropagation();
                        if (trackingId) {
                            void this.copyTrackingId(trackingId, button);
                        }
                    });
                    return button;
                },
            },
            { field: 'orderType', headerName: 'Action', minWidth: 100 },
            { field: 'symbol', headerName: 'Symbol', minWidth: 115 },
            { field: 'name', headerName: 'Name', minWidth: 160 },
            { field: 'quantity', headerName: 'Quantity', minWidth: 110 },
            { field: 'price', headerName: 'Price', minWidth: 110 },
            { field: 'status', headerName: 'Status', minWidth: 125 },
            { field: 'clientId', headerName: 'Client ID', minWidth: 220 },
            {
                field: 'executedAt', headerName: 'Change log time', minWidth: 190,
                valueFormatter: (params) => params.value || 'Pending'
            },
            {
                colId: 'actions', headerName: 'Actions', minWidth: 130, sortable: false,
                cellRenderer: (params: { data: Order }) => {
                    const button = document.createElement('button');
                    const trackingId = params.data.trackingId ?? '';
                    const canCancel = params.data.status === 'PENDING' || params.data.status === 'SUBMITTED';
                    button.type = 'button';
                    button.textContent = 'Cancel';
                    button.disabled = !trackingId || !canCancel || this.cancellingTrackingId() === trackingId;
                    button.title = !trackingId
                        ? 'Tracking ID unavailable'
                        : canCancel ? 'Cancel order' : `Orders in ${params.data.status} status cannot be canceled`;
                    button.style.border = '0';
                    button.style.borderRadius = '0.3rem';
                    button.style.padding = '0.35rem 0.6rem';
                    button.style.color = '#08131c';
                    button.style.cursor = button.disabled ? 'default' : 'pointer';
                    button.style.fontWeight = '800';
                    button.style.background = '#f0b45b';
                    button.addEventListener('click', (event) => {
                        event.stopPropagation();
                        if (trackingId && canCancel) {
                            this.cancelOrder(trackingId);
                        }
                    });
                    return button;
                },
            },
        ];
    }

    private async copyTrackingId(trackingId: string, button: HTMLButtonElement): Promise<void> {
        try {
            if (!navigator.clipboard) {
                throw new Error('Clipboard access is unavailable.');
            }
            await navigator.clipboard.writeText(trackingId);
            button.textContent = 'Copied';
            window.setTimeout(() => {
                button.textContent = trackingId;
            }, 1500);
            this.copyError.set(null);
        } catch (error) {
            console.error('Unable to copy tracking ID:', error);
            this.copyError.set('Unable to copy the tracking ID. Please copy it manually.');
        }
    }

    searchStatusLog(): void {
        const trackingId = this.trackingIdSearch().trim();
        this.statusLogMessage.set(null);
        this.statusLogError.set(null);
        if (!trackingId) {
            this.statusLogError.set('Enter a tracking ID to search.');
            return;
        }

        this.statusLogLoading.set(true);
        this.api.getOrderStatusLog(trackingId).subscribe({
            next: (entries: OrderStatusLog) => {
                this.statusLogLoading.set(false);
                this.statusLog.set(entries);
                const entryCount = Object.keys(entries).length;
                this.statusLogMessage.set(
                    `Status log loaded for ${trackingId} (${entryCount} change${entryCount === 1 ? '' : 's'}).`,
                );
            },
            error: (error) => {
                this.statusLogLoading.set(false);
                this.statusLogError.set(error?.status === 404
                    ? 'No order was found for that tracking ID.'
                    : 'Unable to load the status log. Please try again.');
            },
        });
    }

    private formatStatusTimestamp(timestamp: string): string {
        const date = new Date(timestamp);
        return Number.isNaN(date.getTime())
            ? timestamp
            : new Intl.DateTimeFormat('en-US', {
                dateStyle: 'medium',
                timeStyle: 'medium',
            }).format(date);
    }

    private normalizeStatus(status: string): string {
        const normalized = status.trim().toUpperCase().replace(/\s+/g, '_');
        return normalized === 'CANCELLED' ? 'CANCELED' : normalized;
    }

    private formatStatusLabel(status: string): string {
        return status
            .toLowerCase()
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (character) => character.toUpperCase());
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

    selectRange(range: ChartRange): void {
        this.selectedRange.set(range);
        if (this.symbol()) {
            this.search();
        }
    }

    selectRangeFromEvent(event: Event): void {
        const value = (event.target as HTMLSelectElement).value as ChartRange;
        if (this.ranges.includes(value)) {
            this.selectRange(value);
        }
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

        const instrumentType = this.selectedInstrumentType();
        const request: OrderRequest = {
            clientId,
            symbol: requestedSymbol,
            name: this.instrumentName() || requestedSymbol,
            quantity: requestedQuantity,
            transactionType: this.orderSide(),
            instrument: instrumentType,
            instrumentType,
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

    private cancelOrder(trackingId: string): void {
        if (this.cancellingTrackingId()) {
            return;
        }

        this.cancellingTrackingId.set(trackingId);
        this.orderMessage.set(null);
        this.orderError.set(null);

        this.trading.cancelOrder(trackingId).subscribe({
            next: () => {
                this.orderMessage.set(`Order ${trackingId} canceled.`);
                const clientId = this.auth.getClientId();
                if (clientId) {
                    this.trading.loadOrders(clientId).subscribe({
                        next: (orders) => this.orders.set(orders),
                        error: (error) => console.error('Error refreshing orders:', error),
                    });
                }
            },
            error: () => {
                this.cancellingTrackingId.set(null);
                this.orderError.set('Order could not be canceled. Please try again.');
            },
            complete: () => this.cancellingTrackingId.set(null),
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

    private selectedInstrumentType(): 'EQUITY' | 'CRYPTO' | 'CASH' {
        const market = this.activeMarket();
        if (market === 'Crypto') {
            return 'CRYPTO';
        }
        if (market === 'Forex') {
            return 'CASH';
        }
        return 'EQUITY';
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
            candles: this.api.getCandles(requestedSymbol, this.candleQuery()),
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

    private candleQuery(): { from?: string; to?: string } {
        const rangeDays: Record<Exclude<ChartRange, 'ALL'>, number> = {
            '1D': 1, '1W': 7, '1M': 30, '3M': 90, '1Y': 365,
        };
        const range = this.selectedRange();
        if (range === 'ALL') {
            return {};
        }

        const to = new Date();
        const from = new Date(to);
        from.setDate(from.getDate() - rangeDays[range]);
        return { from: this.toDateParam(from), to: this.toDateParam(to) };
    }

    private toDateParam(date: Date): string {
        return date.toISOString().slice(0, 10);
    }

    async logout(): Promise<void> {
        await this.auth.signOut();
        this.router.navigateByUrl('/');
    }
}
