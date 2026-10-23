import { Component, DestroyRef, signal, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PortfolioTableComponent } from '../components/portfolio-table/portfolio-table';
import { PortfolioTable } from '../interfaces/portfolio-table.interface';
import { OrdersTable, InstrumentType, OrderAction } from '../interfaces/orders-table.interface';
import { TopBar } from '../../components/top-bar/top-bar';
import { PieChartComponent } from '../components/pie-chart/pie-chart';
import { BarChartComponent } from '../components/bar-chart/bar-chart';
import { AdminOrdersTableComponent } from './components/admin-orders-table/admin-orders-table';
import { AuthService } from '../../../core/services/auth.service';
import { TradingService } from '../../../core/services/trading.service';
import { Client, Holding, Order, TradingActivityResponse } from '../../../core/models/trading.models';
import { ADMIN_NAV_ITEMS } from './admin-navigation';
import { forkJoin, Subscription } from 'rxjs';

type AdminDashboardTab = 'portfolio' | 'orders';
type AdminClient = Client;
type ActivityRange = '1D' | '1W' | '1M' | '3M' | '1Y';

type AdminPortfolioHolding = PortfolioTable & { clientId: string };
export type AdminOrder = OrdersTable & { clientId: string; trackingId: string };

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
    private readonly trading = inject(TradingService);
    private readonly destroyRef = inject(DestroyRef);
    private activityRequest?: Subscription;

    readonly adminName = computed(() =>
        this.auth.profile()?.name ?? this.auth.user()?.email ?? 'Admin',
    );

    readonly navItems = ADMIN_NAV_ITEMS;

    readonly selectedAccountId = signal<string | null>(null);
    readonly searchQuery = signal('');
    readonly clients = signal<AdminClient[]>([]);
    readonly selectedAccount = signal<AdminClient | null>(null);
    readonly holdings = signal<AdminPortfolioHolding[]>([]);
    readonly orders = signal<AdminOrder[]>([]);
    readonly loadingClientSearch = signal(false);
    readonly loadingClientData = signal(false);
    readonly searchError = signal<string | null>(null);
    readonly activeTab = signal<AdminDashboardTab>('portfolio');
    readonly activityRanges: readonly ActivityRange[] = ['1D', '1W', '1M', '3M', '1Y'];
    readonly activityRange = signal<ActivityRange>('1D');
    readonly tradingActivity = signal<TradingActivityResponse | null>(null);
    readonly loadingActivity = signal(false);
    readonly activityError = signal<string | null>(null);
    readonly totalTrades = computed(() =>
        this.tradingActivity()?.points.reduce((total, point) => total + point.tradeCount, 0) ?? 0,
    );

    readonly portfolioHoldings = computed(() =>
        [...this.holdings()].sort((a, b) => a.symbol.localeCompare(b.symbol)),
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
        [...this.orders()].sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime()),
    );

    setTab(tab: AdminDashboardTab): void {
        this.activeTab.set(tab);
    }

    setActivityRange(range: ActivityRange): void {
        this.activityRange.set(range);
        this.loadTradingActivity();
    }

    loadTradingActivity(): void {
        this.activityRequest?.unsubscribe();
        this.tradingActivity.set(null);
        this.activityError.set(null);
        this.loadingActivity.set(false);
        const client = this.selectedAccount();
        if (!client) {
            return;
        }

        const range = this.activityRange();
        const to = new Date();
        const from = new Date(to);
        if (range === '1D' || range === '1W') {
            from.setUTCDate(from.getUTCDate() - (range === '1D' ? 1 : 7));
        } else {
            const day = from.getUTCDate();
            from.setUTCDate(1);
            from.setUTCMonth(from.getUTCMonth() - (range === '1M' ? 1 : range === '3M' ? 3 : 12));
            const lastDay = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 0)).getUTCDate();
            from.setUTCDate(Math.min(day, lastDay));
        }

        this.loadingActivity.set(true);
        this.activityRequest = this.trading.getTradingActivity({
            clientEmail: client.email,
            from: from.toISOString(),
            to: to.toISOString(),
            interval: range === '1D' ? 'hour' : range === '1Y' ? 'week' : 'day',
        }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: activity => {
                this.tradingActivity.set(activity);
                this.loadingActivity.set(false);
            },
            error: error => {
                console.error('Error fetching client trading activity:', error);
                this.loadingActivity.set(false);
                this.activityError.set('Unable to load trading activity. Please try again.');
            },
        });
    }

    setClient(clientId: string): void {
        const client = this.clients().find(candidate => candidate.id === clientId);
        if (client) {
            this.selectClient(client);
        }
    }

    absoluteValue(value: number): number {
        return Math.abs(value);
    }

    searchClient(): void {
        const email = this.searchQuery().trim();
        if (!email) {
            this.searchError.set('Enter a client email address.');
            return;
        }

        this.loadingClientSearch.set(true);
        this.searchError.set(null);
        this.trading.getClientByEmail(email).subscribe({
            next: (client) => {
                this.loadingClientSearch.set(false);
                this.clients.update(clients =>
                    clients.some(existing => existing.id === client.id)
                        ? clients
                        : [...clients, client],
                );
                this.selectClient(client);
            },
            error: (error) => {
                console.error('Error searching client by email:', error);
                this.loadingClientSearch.set(false);
                this.searchError.set('No client found with that email address.');
            },
        });
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

    private selectClient(client: AdminClient): void {
        this.selectedAccountId.set(client.id);
        this.selectedAccount.set(client);
        this.loadTradingActivity();
        this.loadingClientData.set(true);
        this.holdings.set([]);
        this.orders.set([]);

        forkJoin({
            holdings: this.trading.getHoldings(client.id),
            orders: this.trading.getOrders(client.id),
        }).subscribe({
            next: ({ holdings, orders }) => {
                this.holdings.set(this.toPortfolioHoldings(holdings));
                this.orders.set(orders.map(order => this.toAdminOrder(order)));
                this.loadingClientData.set(false);
            },
            error: (error) => {
                console.error(`Error fetching data for client ${client.id}:`, error);
                this.loadingClientData.set(false);
                this.searchError.set('Unable to load the selected client data.');
            },
        });
    }

    private toPortfolioHoldings(holdings: Holding[]): AdminPortfolioHolding[] {
        const rows = holdings.map(holding => ({
            clientId: holding.clientId,
            symbol: holding.symbol,
            name: holding.name ?? holding.symbol,
            shares: Number(holding.quantity) || 0,
            value: Number(holding.currentValue) || 0,
            allocation: 0,
            dayChange: 0,
            overallReturn: 0,
        }));
        const totalValue = rows.reduce((total, holding) => total + holding.value, 0);

        return rows.map(holding => ({
            ...holding,
            allocation: totalValue > 0 ? (holding.value / totalValue) * 100 : 0,
        }));
    }

    private toAdminOrder(order: Order): AdminOrder {
        return {
            clientId: order.clientId,
            trackingId: order.trackingId ?? order.id,
            action: order.orderType as OrderAction,
            symbol: order.symbol,
            name: order.name ?? order.symbol,
            transactionDate: new Date(order.executedAt ?? 0),
            shares: order.quantity,
            price: order.price ?? 0,
            instrument: 'STOCK' as InstrumentType,
            status: order.status,
        };
    }
}
