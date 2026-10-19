import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PortfolioTableComponent } from '../components/portfolio-table/portfolio-table';
import { PortfolioTable } from '../interfaces/portfolio-table.interface';
import { OrdersTable } from '../interfaces/orders-table.interface';
import { TopBar } from '../../components/top-bar/top-bar';
import { PieChartComponent } from '../components/pie-chart/pie-chart';
import { BarChartComponent } from '../components/bar-chart/bar-chart';
import { AdminOrdersTableComponent } from './components/admin-orders-table/admin-orders-table';
import { AuthService } from '../../../core/services/auth.service';

type AdminDashboardTab = 'portfolio' | 'orders';

interface AdminClient {
    id: string;
    name: string;
    email: string;
}

type AdminPortfolioHolding = PortfolioTable & { clientId: string };
export type AdminOrder = OrdersTable & { clientId: string; trackingId: string };

const MOCK_CLIENTS: AdminClient[] = [
    { id: 'client-xxxx', name: 'Alex Morgan', email: 'alex.morgan@example.com' },
    { id: 'client-yyyy', name: 'Jordan Lee', email: 'jordan.lee@example.com' },
    { id: 'client-zzzz', name: 'Taylor Smith', email: 'taylor.smith@example.com' },
];

const MOCK_PORTFOLIO: AdminPortfolioHolding[] = [
    { clientId: 'client-xxxx', symbol: 'AAPL', name: 'Apple Inc.', shares: 12, value: 2271.84, allocation: 30, dayChange: 3.42, overallReturn: 8.5 },
    { clientId: 'client-xxxx', symbol: 'MSFT', name: 'Microsoft Corp.', shares: 3, value: 1246.8, allocation: 20, dayChange: -1.23, overallReturn: 4.2 },
    { clientId: 'client-yyyy', symbol: 'AMZN', name: 'Amazon.com Inc.', shares: 5, value: 891.05, allocation: 15, dayChange: 7.32, overallReturn: 11.8 },
    { clientId: 'client-yyyy', symbol: 'NVDA', name: 'NVIDIA Corp.', shares: 8, value: 971.2, allocation: 20, dayChange: 23.4, overallReturn: 18.6 },
    { clientId: 'client-zzzz', symbol: 'TSLA', name: 'Tesla Inc.', shares: 4, value: 955.6, allocation: 15, dayChange: -2.30, overallReturn: -3.1 },
];

const MOCK_ORDERS: AdminOrder[] = [
    { clientId: 'client-xxxx', trackingId: 'TRK-10001', action: 'BUY', symbol: 'AAPL', name: 'Apple Inc.', transactionDate: new Date('2024-01-15'), shares: 10, price: 190.5, instrument: 'STOCK', status: 'PENDING' },
    { clientId: 'client-xxxx', trackingId: 'TRK-10002', action: 'SELL', symbol: 'TSLA', name: 'Tesla Inc.', transactionDate: new Date('2024-01-20'), shares: 2, price: 238.9, instrument: 'STOCK', status: 'PENDING' },
    { clientId: 'client-yyyy', trackingId: 'TRK-10003', action: 'BUY', symbol: 'AMZN', name: 'Amazon.com Inc.', transactionDate: new Date('2024-01-25'), shares: 3, price: 3200.0, instrument: 'STOCK', status: 'PENDING' },
    { clientId: 'client-zzzz', trackingId: 'TRK-10004', action: 'SELL', symbol: 'MSFT', name: 'Microsoft Corp.', transactionDate: new Date('2024-01-30'), shares: 1, price: 415.0, instrument: 'STOCK', status: 'PENDING' },
];

@Component({
    imports: [
        CommonModule,
        FormsModule,
        PortfolioTableComponent,
        AdminOrdersTableComponent,
        PieChartComponent,
        BarChartComponent,
        TopBar,
    ],
    selector: 'app-admin-dashboard',
    standalone: true,
    templateUrl: './admin-dashboard.html',
    styleUrls: ['./admin-dashboard.css', '../styles/dashboard.css'],
})
export class AdminDashboard {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    readonly adminName = computed(() =>
        this.auth.profile()?.name ?? this.auth.user()?.email ?? 'Admin',
    );

    readonly selectedAccountId = signal(MOCK_CLIENTS[0].id);
    readonly searchQuery = signal('');
    private readonly clientTabIds = signal<string[]>([MOCK_CLIENTS[0].id]);

    readonly clients = computed(() =>
        MOCK_CLIENTS.filter(client => this.clientTabIds().includes(client.id)),
    );

    readonly selectedAccount = computed(() =>
        MOCK_CLIENTS.find(client => client.id === this.selectedAccountId()) ?? MOCK_CLIENTS[0],
    );

    readonly activeTab = signal<AdminDashboardTab>('portfolio');

    readonly portfolioHoldings = computed(() =>
        MOCK_PORTFOLIO
            .filter(holding => holding.clientId === this.selectedAccountId())
            .sort((a, b) => a.symbol.localeCompare(b.symbol)),
    );

    readonly portfolioValue = computed(() =>
        this.portfolioHoldings().reduce((total, holding) => total + holding.value, 0),
    );

    readonly totalGainLoss = computed(() =>
        this.portfolioHoldings().reduce(
            (total, holding) => total + holding.value * (holding.overallReturn ?? 0) / 100,
            0,
        ),
    );

    readonly gainLossPercentage = computed(() => {
        const value = this.portfolioValue();
        return value > 0 ? (this.totalGainLoss() / value) * 100 : 0;
    });

    readonly dayChange = computed(() => {
        const value = this.portfolioValue();
        return value > 0
            ? this.portfolioHoldings().reduce(
                (total, holding) => total + holding.value * (holding.dayChange ?? 0),
                0,
            ) / value
            : 0;
    });

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

    absoluteValue(value: number): number {
        return Math.abs(value);
    }

    searchClient(): void {
        const query = this.searchQuery().trim().toLowerCase();
        if (!query) {
            return;
        }

        const client = MOCK_CLIENTS.find(candidate =>
            [candidate.id, candidate.name, candidate.email]
                .some(value => value.toLowerCase().includes(query)),
        );

        if (!client) {
            return;
        }

        this.clientTabIds.update(clientIds =>
            clientIds.includes(client.id) ? clientIds : [...clientIds, client.id],
        );
        this.selectedAccountId.set(client.id);
    }

    protected readonly analyticsData = computed(() =>
        this.portfolioHoldings().map(holding => ({
            label: holding.symbol,
            value: holding.allocation,
        })),
    );

    logout(): void {
        this.auth.signOut();
        this.router.navigate(['/']);
    }
}
