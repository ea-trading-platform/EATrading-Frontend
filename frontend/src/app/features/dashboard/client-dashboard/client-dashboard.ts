import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { TradingService } from '../../../core/services/trading.service';
import { Client, Holding, PortfolioHistory, PortfolioSummary } from '../../../core/models/trading.models';
import { StockSearch } from './components/stock-search/stock-search';
import { PortfolioTableComponent } from '../components/portfolio-table/portfolio-table';
import { PortfolioTable } from '../interfaces/portfolio-table.interface';
import { OrdersTable } from '../interfaces/orders-table.interface';
import { OrdersTableComponent } from '../components/orders-table/orders-table';
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

const MOCK_ORDERS: OrdersTable[] = [
    {
        action: 'BUY',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        transactionDate: new Date('2024-01-15'),
        shares: 10,
        price: 190.5,
        instrument: 'EQUITY',
        status: 'ACCEPTED',
    },
    {
        action: 'SELL',
        symbol: 'TSLA',
        name: 'Tesla Inc.',
        transactionDate: new Date('2024-01-20'),
        shares: 2,
        price: 238.9,
        instrument: 'EQUITY',
        status: 'ACCEPTED',
    },
    {
        action: 'BUY',
        symbol: 'AMZN',
        name: 'Amazon.com Inc.',
        transactionDate: new Date('2024-01-25'),
        shares: 3,
        price: 3200.0,
        instrument: 'EQUITY',
        status: 'ACCEPTED',
    },
    {
        action: 'SELL',
        symbol: 'MSFT',
        name: 'Microsoft Corp.',
        transactionDate: new Date('2024-01-30'),
        shares: 1,
        price: 415.0,
        instrument: 'EQUITY',
        status: 'ACCEPTED',
    }
];

@Component({
    imports: [
        DecimalPipe,
        StockSearch,
        PortfolioTableComponent,
        OrdersTableComponent,
        TopBar,
        BalanceGraph,
        StockTicker,
        WatchlistComponent,
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
    protected readonly orders = signal<OrdersTable[]>(MOCK_ORDERS);
    protected readonly loadingOrders = signal(false);
    protected readonly portfolioSummary = signal<PortfolioSummary | null>(null);
    protected readonly portfolioHistory = signal<PortfolioHistory | null>(null);

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
    protected readonly totalGainLoss = computed(() =>
        Number(this.portfolioSummary()?.overallReturnUsd) ||
        this.holdings().reduce((total, holding) => {
            const currentValue = Number(holding.currentValue) || 0;
            const costBasis = (Number(holding.quantity) || 0) * (Number(holding.avgBuyPrice) || 0);
            return total + currentValue - costBasis;
        }, 0),
    );
    protected readonly gainLossPercentage = computed(() => {
        const summaryPercentage = Number(this.portfolioSummary()?.overallReturnPercent);
        if (Number.isFinite(summaryPercentage)) {
            return summaryPercentage;
        }
        const costBasis = this.holdings().reduce(
            (total, holding) => total + (Number(holding.quantity) || 0) * (Number(holding.avgBuyPrice) || 0),
            0,
        );
        return costBasis > 0 ? (this.totalGainLoss() / costBasis) * 100 : 0;
    });
    protected readonly orderHistory = computed(() =>
        [...this.orders()].sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime()),
    );
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
            totals[instrument] = (totals[instrument] ?? 0) + (Number(holding.currentValue) || 0);
            return totals;
        }, {});
        return [
            { label: 'Equities', value: byInstrument['EQUITY'] ?? 0 },
            { label: 'Crypto', value: byInstrument['CRYPTO'] ?? 0 },
            { label: 'Forex', value: byInstrument['FOREX'] ?? 0 },
            { label: 'Cash', value: Number(this.portfolioSummary()?.availableCashUsd) || 0 },
        ];
    });

    protected readonly stocksSignal = signal<StockTickerData[]>([]);
    protected readonly loadingTickers = signal(false);

    protected absoluteValue(value: number): number {
        return Math.abs(value);
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
                // Map API response to OrdersTable interface
                if (Array.isArray(orders)) {
                    this.orders.set(orders as OrdersTable[]);
                }
                this.loadingOrders.set(false);
            },
            error: (err) => {
                console.error('Error fetching orders:', err);
                // Keep mock data on error
                this.loadingOrders.set(false);
            },
        });
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
