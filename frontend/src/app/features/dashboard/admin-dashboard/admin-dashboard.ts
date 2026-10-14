import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PortfolioTableComponent } from '../components/portfolio-table/portfolio-table';
import { PortfolioTable } from '../interfaces/portfolio-table.interface';
import { OrdersTableComponent } from '../components/orders-table/orders-table';
import { OrdersTable } from '../interfaces/orders-table.interface';
import { TopBar } from '../../components/top-bar/top-bar';
import { PieChartComponent } from '../components/pie-chart/pie-chart';
import { AuthService } from '../../../core/services/auth.service';
type AdminDashboardTab = 'portfolio' | 'orders' | 'analytics';
interface AdminClient {
    id: string;
    name: string;
    email: string;
}

type AdminPortfolioHolding = PortfolioTable & { clientId: string };
type AdminOrder = OrdersTable & { clientId: string };

const MOCK_CLIENTS: AdminClient[] = [
    { id: 'client-xxxx', name: 'Alex Morgan', email: 'alex.morgan@example.com' },
    { id: 'client-yyyy', name: 'Jordan Lee', email: 'jordan.lee@example.com' },
    { id: 'client-zzzz', name: 'Taylor Smith', email: 'taylor.smith@example.com' },
];

const MOCK_PORTFOLIO: AdminPortfolioHolding[] = [
    { clientId: 'client-xxxx', symbol: 'AAPL', name: 'Apple Inc.', shares: 12, value: 2271.84, allocation: 30, dayChange: 3.42, overallReturn: 0 },
    { clientId: 'client-xxxx', symbol: 'MSFT', name: 'Microsoft Corp.', shares: 3, value: 1246.8, allocation: 20, dayChange: -1.23, overallReturn: 0 },
    { clientId: 'client-yyyy', symbol: 'AMZN', name: 'Amazon.com Inc.', shares: 5, value: 891.05, allocation: 15, dayChange: 7.32, overallReturn: 0 },
    { clientId: 'client-yyyy', symbol: 'NVDA', name: 'NVIDIA Corp.', shares: 8, value: 971.2, allocation: 20, dayChange: 23.4, overallReturn: 0 },
    { clientId: 'client-zzzz', symbol: 'TSLA', name: 'Tesla Inc.', shares: 4, value: 955.6, allocation: 15, dayChange: -2.30, overallReturn: 0 },
];

const MOCK_ORDERS: AdminOrder[] = [
    {
        clientId: 'client-xxxx',
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
        clientId: 'client-xxxx',
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
        clientId: 'client-yyyy',
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
        clientId: 'client-zzzz',
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
        CommonModule,
        PortfolioTableComponent,
        OrdersTableComponent,
        PieChartComponent,
        TopBar,
    ],
    selector: 'app-admin-dashboard',
    standalone: true,
    templateUrl: './admin-dashboard.html',
    styleUrls: ['./admin-dashboard.css', '../styles/dashboard.css']
})
export class AdminDashboard {
        private readonly auth = inject(AuthService);
        private readonly router = inject(Router);

        readonly selectedAccountId = signal(MOCK_CLIENTS[0].id);

        protected readonly clients = MOCK_CLIENTS;

        readonly selectedAccount = computed(() =>
                this.clients.find(client => client.id === this.selectedAccountId()) ?? this.clients[0],
        );

        readonly activeTab = signal<AdminDashboardTab>('portfolio');

        readonly portfolioHoldings = computed(() =>
                MOCK_PORTFOLIO
                        .filter(holding => holding.clientId === this.selectedAccountId())
                        .sort((a, b) => a.symbol.localeCompare(b.symbol)),
        );

        readonly orderHistory = computed(() =>
                MOCK_ORDERS
                        .filter(order => order.clientId === this.selectedAccountId())
                        .sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime()),
        );

        setTab(tab: AdminDashboardTab): void {
                this.activeTab.set(tab);
        }

        setClient(clientId: string): void {
                this.selectedAccountId.set(clientId);
        }

        protected readonly analyticsData = computed(() =>
            this.portfolioHoldings().map(h => ({ label: h.symbol, value: h.value })),
        );

        logout(): void {
                this.auth.signOut();
                this.router.navigate(['/']);
        }
}