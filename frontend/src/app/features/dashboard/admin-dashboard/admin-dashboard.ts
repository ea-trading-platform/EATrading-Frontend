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

        // Simulate a selected account (single mock account for now)
        protected readonly selectedAccountId = signal('mock-account-id');

        protected readonly selectedAccount = computed(() => ({
                id: this.selectedAccountId(),
                name: 'Mock Account',
                email: 'mock@example.com',
        }));

        protected readonly activeTab = signal<AdminDashboardTab>('portfolio');

        protected readonly portfolioHoldings = computed(() =>
                [...MOCK_PORTFOLIO].sort((a, b) => a.symbol.localeCompare(b.symbol)),
        );

        protected readonly orderHistory = computed(() =>
                [...MOCK_ORDERS].sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime()),
        );

        setTab(tab: AdminDashboardTab): void {
                this.activeTab.set(tab);
        }

        protected readonly analyticsData = computed(() =>
            this.portfolioHoldings().map(h => ({ label: h.symbol, value: h.value })),
        );

        logout(): void {
                this.auth.signOut();
                this.router.navigate(['/']);
        }
}