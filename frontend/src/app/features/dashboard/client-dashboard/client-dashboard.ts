import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { TradingService } from '../../../core/services/trading.service';
import { Client, Holding } from '../../../core/models/trading.models';
import { StockSearch } from './components/stock-search/stock-search';
import { PortfolioTableComponent } from '../components/portfolio-table/portfolio-table';
import { PortfolioTable } from '../interfaces/portfolio-table.interface';
import { OrdersTable } from '../interfaces/orders-table.interface';
import { OrdersTableComponent } from '../components/orders-table/orders-table';
import { BalanceGraphInterface } from '../interfaces/balances-graph.interface';
import { BalanceGraph } from '../components/balance-graph/balance-graph';
import { TopBar } from '../../components/top-bar/top-bar';
import { StockTicker } from '../components/stock-ticker/stock-ticker';
import { StockTickerData } from '../interfaces/stock-ticker.interface';
import { WatchlistComponent } from '../components/watchlist/watchlist';
import { TopMoversComponent } from '../components/top-movers/top-movers';
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
        instrument: 'STOCK',
        status: 'PENDING',
    },
    {
        action: 'SELL',
        symbol: 'TSLA',
        name: 'Tesla Inc.',
        transactionDate: new Date('2024-01-20'),
        shares: 2,
        price: 238.9,
        instrument: 'STOCK',
        status: 'PENDING',
    },
    {
        action: 'BUY',
        symbol: 'AMZN',
        name: 'Amazon.com Inc.',
        transactionDate: new Date('2024-01-25'),
        shares: 3,
        price: 3200.0,
        instrument: 'STOCK',
        status: 'PENDING',
    },
    {
        action: 'SELL',
        symbol: 'MSFT',
        name: 'Microsoft Corp.',
        transactionDate: new Date('2024-01-30'),
        shares: 1,
        price: 415.0,
        instrument: 'STOCK',
        status: 'PENDING',
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
        TopMoversComponent
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

    protected readonly account = signal<Client | null>(null);
    protected readonly loadingAccount = signal(false);
    protected readonly holdings = signal<Holding[]>([]);
    protected readonly loadingHoldings = signal(false);
    protected readonly orders = signal<OrdersTable[]>(MOCK_ORDERS);
    protected readonly loadingOrders = signal(false);

    protected readonly activeTab = signal<ClientDashboardTab>('portfolio');
    protected readonly portfolioHoldings = computed(() =>
        this.holdings()
            .map((holding) => this.toPortfolioRow(holding))
            .sort((a, b) => a.symbol.localeCompare(b.symbol)),
    );
    protected readonly portfolioValue = computed(() =>
        this.holdings().reduce((total, holding) => total + (Number(holding.currentValue) || 0), 0),
    );
    protected readonly orderHistory = computed(() =>
        [...this.orders()].sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime()),
    );
    protected readonly balanceData = computed<BalanceGraphInterface[]>(() => {
        const balance = Number(this.account()?.totalBalance);
        return Number.isFinite(balance)
            ? [{ date: new Date().toISOString(), balance }]
            : [];
    });

    protected readonly stocksSignal = signal<StockTickerData[]>([]);
    protected readonly loadingTickers = signal(false);

    ngOnInit(): void {
        this.fetchAccount();
        this.fetchHoldings();
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
