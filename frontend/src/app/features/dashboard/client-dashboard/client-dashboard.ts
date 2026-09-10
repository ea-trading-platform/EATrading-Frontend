import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService, User } from '../../../core/services/api.service';
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
type ClientDashboardTab = 'portfolio' | 'orders';

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

const MOCK_BALANCES: BalanceGraphInterface[] = [
    { date: '2024-01-01', balance: 50000 },
    { date: '2024-01-02', balance: 51200 },
    { date: '2024-01-03', balance: 50800 },
    { date: '2024-01-04', balance: 52500 },
    { date: '2024-01-05', balance: 53100 },
    { date: '2024-01-08', balance: 52900 },
    { date: '2024-01-09', balance: 54300 },
    { date: '2024-01-10', balance: 55600 },
    { date: '2024-01-11', balance: 56200 },
    { date: '2024-01-12', balance: 57100 },
];

const MOCK_PORTFOLIO: PortfolioTable[] = [
    { symbol: 'AAPL', name: 'Apple Inc.', shares: 12, value: 2271.84, allocation: 30, dayChange: 3.42, overallReturn: 0 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', shares: 5, value: 891.05, allocation: 15, dayChange: 7.32, overallReturn: 0 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', shares: 3, value: 1246.8, allocation: 20, dayChange: -1.23, overallReturn: 0 },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', shares: 8, value: 971.2, allocation: 20, dayChange: 23.4, overallReturn: 0 },
    { symbol: 'TSLA', name: 'Tesla Inc.', shares: 4, value: 955.6, allocation: 15, dayChange: -2.30, overallReturn: 0 },
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
    StockTicker
  ],
  selector: 'app-client-dashboard',
  standalone: true,
  styleUrl: './client-dashboard.css',
  templateUrl: './client-dashboard.html',
})
export class ClientDashboard implements OnInit {
    protected readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly api = inject(ApiService);
  
    protected readonly account = signal<User | null>(null);
    protected readonly loadingAccount = signal(false);

    protected readonly activeTab = signal<ClientDashboardTab>('portfolio');
    protected readonly portfolioHoldings = computed(() =>
        [...MOCK_PORTFOLIO].sort((a, b) => a.symbol.localeCompare(b.symbol)),
    );
    protected readonly orderHistory = computed(() => 
        [...MOCK_ORDERS].sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime()),
    );
    protected readonly balanceData = [...MOCK_BALANCES];
    protected readonly stocksSignal = signal<StockTickerData[]>(MOCK_TICKER);
  
    ngOnInit(): void {
        this.fetchAccount();
    }
  
    setTab(tab: ClientDashboardTab): void {
        this.activeTab.set(tab);
    }
  
    private fetchAccount(): void {
        const userId = this.auth.user()?.id;
        if (!userId) {
            return;
        }

        this.loadingAccount.set(true);
        this.api.getUserByUuid(userId).subscribe({
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

    async logout(): Promise<void> {
        await this.auth.signOut();
        this.router.navigateByUrl('/');
    }
  }
  