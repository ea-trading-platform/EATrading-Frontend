import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { TradingService } from '../../../core/services/trading.service';
import { Client, Holding, Order, PortfolioHistory, PortfolioSummary } from '../../../core/models/trading.models';
import { StockSearch } from './components/stock-search/stock-search';
import { PortfolioTableComponent } from '../components/portfolio-table/portfolio-table';
import { PortfolioTable } from '../interfaces/portfolio-table.interface';
import { DataGrid } from '../components/data-grid/data-grid';
import { ColDef, GridOptions } from 'ag-grid-community';
import { BalanceGraphInterface } from '../interfaces/balances-graph.interface';
import { BalanceGraph } from '../components/balance-graph/balance-graph';
import { TopBar, TopBarNavItem } from '../../components/top-bar/top-bar';
import { StockTicker } from '../components/stock-ticker/stock-ticker';
import { StockTickerData } from '../interfaces/stock-ticker.interface';
import { WatchlistComponent } from '../components/watchlist/watchlist';
import { TopMoversComponent } from '../components/top-movers/top-movers';
import { PieChartComponent } from '../components/pie-chart/pie-chart';
import { forkJoin } from 'rxjs';
type ClientDashboardTab = 'portfolio' | 'orders';

// Popular stock symbols to display in the ticker
const TICKER_SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'UBER', 'PYPL'];

const MOCK_TICKER: StockTickerData[] = [
    {
        symbol: 'TST1',
        percentChange: 2.5,
        priceHistory: [150, 152, 151, 153, 155, 154, 156, 158]
    },
    {
        symbol: 'TST2',
        percentChange: -1.2,
        priceHistory: [380, 379, 378, 377, 376, 375, 374, 373]
    },
    {
        symbol: 'TST3',
        percentChange: -1.2,
        priceHistory: [380, 379, 378, 377, 376, 375, 374, 373]
    },
    {
        symbol: 'TST4',
        percentChange: 2.5,
        priceHistory: [150, 152, 151, 153, 155, 154, 156, 158]
    },
];

@Component({
    imports: [
        DatePipe,
        DecimalPipe,
        PortfolioTableComponent,
        DataGrid,
        TopBar,
        BalanceGraph,
        StockTicker,
        TopMoversComponent,
        PieChartComponent,
    ],
    selector: 'app-client-dashboard',
    standalone: true,
    styleUrls: ['./client-dashboard.css', '../styles/dashboard.css'],
    templateUrl: './client-dashboard.html',
})
export class ClientDashboard implements OnInit {
    protected readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly api = inject(ApiService);
    private readonly trading = inject(TradingService);

    protected readonly navItems: readonly TopBarNavItem[] = [
        { label: 'Dashboard', route: '/dashboard' },
        { label: 'Transact', route: '/transact' },
        { label: 'News', route: '/news' },
    ];

    protected readonly account = signal<Client | null>(null);
    protected readonly loadingAccount = signal(false);
    protected readonly holdings = signal<Holding[]>([]);
    protected readonly loadingHoldings = signal(false);
    protected readonly orders = signal<Order[]>([]);
    protected readonly loadingOrders = signal(false);
    protected readonly copyError = signal<string | null>(null);
    protected readonly portfolioSummary = signal<PortfolioSummary | null>(null);
    protected readonly portfolioHistory = signal<PortfolioHistory | null>(null);
    protected readonly portfolioSnapshotAsOf = computed(() => this.portfolioSummary()?.asOf ?? null);

    protected readonly activeTab = signal<ClientDashboardTab>('portfolio');
    protected readonly portfolioHoldings = computed(() =>
        this.holdings()
            .map((holding) => this.toPortfolioRow(holding))
            .sort((a, b) => a.symbol.localeCompare(b.symbol)),
    );
    protected readonly portfolioValue = computed(() =>
        Number(this.portfolioSummary()?.portfolioValueUsd) ||
        this.holdings().reduce((total, holding) => total + (Number(holding.currentValue) || 0), 0),
    );
    protected readonly availableToTrade = computed(() => {
        const availableCash = Number(this.portfolioSummary()?.availableCashUsd);
        if (Number.isFinite(availableCash)) {
            return availableCash;
        }
        const accountBalance = Number(this.account()?.totalBalance);
        return Number.isFinite(accountBalance) ? accountBalance : 0;
    });
    protected readonly totalGainLoss = computed(() => {
        const snapshotDayChange = this.toFiniteNumber(this.portfolioSummary()?.dailyChangeUsd);
        if (snapshotDayChange !== null) {
            return snapshotDayChange;
        }

        const historyPoints = this.portfolioHistory()?.points ?? [];
        if (historyPoints.length >= 2) {
            const latestValue = this.toFiniteNumber(historyPoints[historyPoints.length - 1].portfolioValueUsd);
            const priorValue = this.toFiniteNumber(historyPoints[historyPoints.length - 2].portfolioValueUsd);
            if (latestValue !== null && priorValue !== null) {
                return latestValue - priorValue;
            }
        }

        return this.holdings().reduce((total, holding) => {
            const currentValue = Number(holding.currentValue) || 0;
            const costBasis = (Number(holding.quantity) || 0) * (Number(holding.avgBuyPrice) || 0);
            return total + currentValue - costBasis;
        }, 0);
    });
    protected readonly gainLossPercentage = computed(() => {
        const portfolioValue = this.portfolioValue();
        const dayChangeUsd = this.totalGainLoss();
        const previousValue = portfolioValue - dayChangeUsd;
        if (previousValue !== 0) {
            return (dayChangeUsd / previousValue) * 100;
        }

        const snapshotPercentage = this.toFiniteNumber(this.portfolioSummary()?.dailyChangePercent);
        if (snapshotPercentage !== null) {
            return snapshotPercentage;
        }

        const historyPoints = this.portfolioHistory()?.points ?? [];
        if (historyPoints.length >= 2) {
            const latestValue = this.toFiniteNumber(historyPoints[historyPoints.length - 1].portfolioValueUsd);
            const priorValue = this.toFiniteNumber(historyPoints[historyPoints.length - 2].portfolioValueUsd);
            if (latestValue !== null && priorValue !== null && priorValue !== 0) {
                return ((latestValue - priorValue) / priorValue) * 100;
            }
        }

        return 0;
    });
    protected readonly orderHistory = computed(() =>
        [...this.orders()]
            .map((order) => ({
                ...order,
                orderType: this.resolveOrderAction(order),
                name: this.resolveOrderName(order),
                price: this.resolveOrderPrice(order),
            }))
            .sort((a, b) => this.orderTimestamp(b).localeCompare(this.orderTimestamp(a))),
    );
    protected readonly orderGridOptions: GridOptions<Order> = {
        domLayout: 'autoHeight',
        suppressCellFocus: true,
    };
    protected readonly orderColumns: ColDef<Order>[] = [
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
        {
            field: 'quantity',
            headerName: 'Quantity',
            minWidth: 110,
            valueFormatter: (params) => this.formatShareQuantity(params.value),
        },
        { field: 'price', headerName: 'Price', minWidth: 110 },
        { field: 'status', headerName: 'Status', minWidth: 125 },
        {
            field: 'executedAt', headerName: 'Change log time', minWidth: 190,
            valueFormatter: (params) => params.value || 'Pending'
        },
    ];
    protected readonly balanceData = computed<BalanceGraphInterface[]>(() => {
        const points = this.portfolioHistory()?.points ?? [];
        if (points.length > 0) {
            return points.map((point) => ({
                date: point.timestamp,
                balance: Number(point.portfolioValueUsd) || 0,
            }));
        }
        const balance = this.portfolioValue();
        return balance > 0 ? [{ date: new Date().toISOString(), balance }] : [];
    });
    protected readonly portfolioAllocation = computed(() => {
        const byInstrument = this.holdings().reduce<Record<string, number>>((totals, holding) => {
            const instrument = (holding.instrument ?? 'EQUITY').toUpperCase();
            const holdingValue = Number(holding.currentValue) || 0;

            if (instrument === 'CASH') {
                const cashCategory = this.isUsdCashHolding(holding) ? 'CASH_USD' : 'FOREX';
                totals[cashCategory] = (totals[cashCategory] ?? 0) + holdingValue;
                return totals;
            }

            totals[instrument] = (totals[instrument] ?? 0) + holdingValue;
            return totals;
        }, {});
        const summaryCashValue = Number(this.portfolioSummary()?.availableCashUsd) || 0;
        const cashValue = (byInstrument['CASH_USD'] ?? 0) > 0
            ? byInstrument['CASH_USD'] ?? 0
            : summaryCashValue;

        return [
            { label: 'Equities', value: byInstrument['EQUITY'] ?? 0 },
            { label: 'Crypto', value: byInstrument['CRYPTO'] ?? 0 },
            { label: 'Forex', value: byInstrument['FOREX'] ?? 0 },
            { label: 'Cash', value: cashValue },
        ];
    });

    protected readonly stocksSignal = signal<StockTickerData[]>([]);
    protected readonly loadingTickers = signal(false);

    protected absoluteValue(value: number): number {
        return Math.abs(value);
    }

    private toFiniteNumber(value: string | number | undefined): number | null {
        if (value === undefined) {
            return null;
        }
        const parsedValue = typeof value === 'number' ? value : Number(value);
        return Number.isFinite(parsedValue) ? parsedValue : null;
    }

    private formatShareQuantity(value: unknown): string {
        const numericValue = typeof value === 'number' ? value : Number(value);
        if (!Number.isFinite(numericValue)) {
            return '0';
        }

        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 4,
        }).format(numericValue);
    }

    private isUsdCashHolding(holding: Holding): boolean {
        const symbol = holding.symbol.trim().toUpperCase();
        const name = (holding.name ?? '').trim().toUpperCase();
        const normalizedSymbol = symbol.replace(/^CASH:/, '').replace(/^FX:/, '').trim();
        if (normalizedSymbol === 'USD') {
            return true;
        }

        return name === 'USD'
            || name === 'US DOLLAR'
            || name === 'US DOLLARS';
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

    ngOnInit(): void {
        this.fetchAccount();
        this.fetchHoldings();
        this.fetchPortfolioData();
        this.fetchOrders();
        this.fetchTickerData();
    }

    setTab(tab: ClientDashboardTab): void {
        this.activeTab.set(tab);
    }

    private fetchAccount(): void {
        const clientId = this.auth.getClientId();
        if (!clientId) {
            return;
        }

        this.loadingAccount.set(true);
        this.trading.loadClient(clientId).subscribe({
            next: (account) => {
                this.account.set(account ?? null);
                this.loadingAccount.set(false);
            },
            error: (err) => {
                console.error('Error fetching account:', err);
                this.loadingAccount.set(false);
            },
        });
    }

    private fetchOrders(): void {
        const clientId = this.auth.getClientId();
        if (!clientId) {
            return;
        }

        this.loadingOrders.set(true);
        this.trading.loadOrders(clientId).subscribe({
            next: (orders: unknown) => {
                if (Array.isArray(orders)) {
                    this.orders.set(orders as Order[]);
                }
                this.loadingOrders.set(false);
            },
            error: (err) => {
                console.error('Error fetching orders:', err);
                this.orders.set([]);
                this.loadingOrders.set(false);
            },
        });
    }

    private orderTimestamp(order: Order): string {
        return order.executedAt ?? '';
    }

    private resolveOrderAction(order: Order): 'BUY' | 'SELL' {
        const raw = order as Order & {
            transactionType?: string;
            action?: string;
            side?: string;
            buy?: boolean;
        };

        if (raw.orderType === 'BUY' || raw.orderType === 'SELL') {
            return raw.orderType;
        }
        if (typeof raw.buy === 'boolean') {
            return raw.buy ? 'BUY' : 'SELL';
        }

        const action = (raw.transactionType ?? raw.action ?? raw.side ?? '').trim().toUpperCase();
        return action === 'SELL' ? 'SELL' : 'BUY';
    }

    private resolveOrderName(order: Order): string {
        const raw = order as Order & { instrumentName?: string; companyName?: string; asset?: { name?: string } };
        return raw.name?.trim()
            || raw.asset?.name?.trim()
            || raw.instrumentName?.trim()
            || raw.companyName?.trim()
            || order.status;
    }

    private resolveOrderPrice(order: Order): number | undefined {
        const raw = order as Order & {
            executedPrice?: number | string;
            filledPrice?: number | string;
            fillPrice?: number | string;
            averagePrice?: number | string;
            avgPrice?: number | string;
            limitPrice?: number | string;
            assetPrice?: number | string;
        };

        const priceCandidates: Array<number | string | undefined> = [
            raw.price,
            raw.executedPrice,
            raw.filledPrice,
            raw.fillPrice,
            raw.averagePrice,
            raw.avgPrice,
            raw.limitPrice,
            raw.assetPrice,
        ];

        for (const candidate of priceCandidates) {
            if (typeof candidate === 'number' && Number.isFinite(candidate)) {
                return candidate;
            }
            if (typeof candidate === 'string') {
                const parsed = Number(candidate);
                if (Number.isFinite(parsed)) {
                    return parsed;
                }
            }
        }
        return undefined;
    }

    private fetchHoldings(): void {
        const clientId = this.auth.getClientId();
        if (!clientId) {
            return;
        }

        this.loadingHoldings.set(true);
        this.trading.loadHoldings(clientId).subscribe({
            next: (holdings) => {
                this.holdings.set(holdings);
                this.loadingHoldings.set(false);
            },
            error: (err) => {
                console.error('Error fetching holdings:', err);
                this.holdings.set([]);
                this.loadingHoldings.set(false);
            },
        });
    }

    private fetchPortfolioData(): void {
        const clientId = this.auth.getClientId();
        if (!clientId) {
            return;
        }

        this.trading.getPortfolioSummary(clientId).subscribe({
            next: (summary) => this.portfolioSummary.set(summary),
            error: (err) => console.error('Error fetching portfolio summary:', err),
        });

        const to = new Date();
        const from = new Date(to);
        from.setFullYear(to.getFullYear() - 1);
        this.trading.getPortfolioHistory(
            clientId,
            from.toISOString().slice(0, 10),
            to.toISOString().slice(0, 10),
        ).subscribe({
            next: (history) => this.portfolioHistory.set(history),
            error: (err) => console.error('Error fetching portfolio history:', err),
        });
    }

    private toPortfolioRow(holding: Holding): PortfolioTable {
        const value = Number(holding.currentValue) || 0;
        const totalBalance = this.portfolioValue();

        return {
            symbol: holding.symbol,
            name: holding.symbol,
            shares: Number(holding.quantity) || 0,
            value,
            allocation: totalBalance > 0 ? (value / totalBalance) * 100 : 0,
            dayChange: undefined,
            overallReturn: undefined,
        };
    }

    private fetchTickerData(): void {
        this.loadingTickers.set(true);

        // Fetch quotes and candles for all symbols in parallel
        const quoteRequests = TICKER_SYMBOLS.map((symbol) =>
            this.api.getQuote(symbol)
        );
        const candleRequests = TICKER_SYMBOLS.map((symbol) =>
            this.api.getCandles(symbol)
        );

        forkJoin({
            quotes: forkJoin(quoteRequests),
            candles: forkJoin(candleRequests)
        }).subscribe({
            next: ({ quotes, candles }) => {
                const tickerData: StockTickerData[] = TICKER_SYMBOLS.map((symbol, index) => {
                    const quote = quotes[index];
                    const candleResponse = candles[index];

                    // Extract price history from candles (closing prices)
                    // Note: API response wraps candles in a 'data' object
                    const candlesList = (candleResponse as any)?.data?.candles || (candleResponse as any)?.candles || [];
                    const priceHistory = candlesList
                        .map((candle: any) => candle.close)
                        .slice(-8); // Last 8 candles for the sparkline

                    return {
                        symbol,
                        percentChange: quote?.changePercent ?? 0,
                        priceHistory: priceHistory.length > 0 ? priceHistory : [quote?.price ?? 0]
                    };
                });

                this.stocksSignal.set(tickerData);
                this.loadingTickers.set(false);
            },
            error: (err) => {
                console.error('Error fetching ticker data:', err);
                // Fallback to empty array instead of mock data
                this.stocksSignal.set([]);
                this.loadingTickers.set(false);
            }
        });
    }

    async logout(): Promise<void> {
        await this.auth.signOut();
        this.router.navigateByUrl('/');
    }
}
