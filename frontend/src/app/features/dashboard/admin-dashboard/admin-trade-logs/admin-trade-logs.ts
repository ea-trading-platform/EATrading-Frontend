import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { TradingService } from '../../../../core/services/trading.service';
import { Order } from '../../../../core/models/trading.models';
import { TopBar, TopBarNavItem } from '../../../components/top-bar/top-bar';
import { AdminOrdersTableComponent } from '../components/admin-orders-table/admin-orders-table';
import { AdminOrder } from '../admin-dashboard';
import { InstrumentType, OrderAction } from '../../interfaces/orders-table.interface';

type InstrumentFilter = 'ALL' | 'CASH' | 'EQUITY' | 'CRYPTO';
type SideFilter = 'ALL' | 'BUY' | 'SELL';
type StatusFilter = 'ALL' | 'SUBMITTED' | 'ACCEPTED' | 'FILLED' | 'CANCELED' | 'REJECTED';

@Component({
    imports: [CommonModule, FormsModule, TopBar, AdminOrdersTableComponent],
    selector: 'app-admin-trade-logs',
    standalone: true,
    templateUrl: './admin-trade-logs.html',
    styleUrls: ['./admin-trade-logs.css', '../admin-dashboard.css', '../../styles/dashboard.css'],
})
export class AdminTradeLogs implements OnInit {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly trading = inject(TradingService);

    readonly adminName = computed(() =>
        this.auth.profile()?.name ?? this.auth.user()?.email ?? 'Admin',
    );

    readonly navItems: readonly TopBarNavItem[] = [
        { label: 'Dashboard', route: '/admin-dashboard' },
        { label: 'Trade Logs', route: '/admin-trade-logs' },
    ];

    readonly instruments: readonly InstrumentFilter[] = ['ALL', 'CASH', 'EQUITY', 'CRYPTO'];
    readonly sides: readonly SideFilter[] = ['ALL', 'BUY', 'SELL'];
    readonly statuses: readonly StatusFilter[] = [
        'ALL', 'SUBMITTED', 'ACCEPTED', 'FILLED', 'CANCELED', 'REJECTED',
    ];

    readonly orders = signal<Order[]>([]);
    readonly selectedInstrument = signal<InstrumentFilter>('ALL');
    readonly selectedSide = signal<SideFilter>('ALL');
    readonly selectedStatus = signal<StatusFilter>('ALL');
    readonly clientEmailQuery = signal('');
    readonly selectedClientEmail = signal('');
    readonly fromDate = signal('');
    readonly toDate = signal('');
    readonly loadingOrders = signal(false);
    readonly loadError = signal<string | null>(null);

    readonly orderHistory = computed(() =>
        this.orders()
            .filter(order => this.matchesFilters(order))
            .map(order => this.toAdminOrder(order))
            .sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime()),
    );

    ngOnInit(): void {
        this.loadOrders();
    }

    clearFilters(): void {
        this.selectedInstrument.set('ALL');
        this.selectedSide.set('ALL');
        this.selectedStatus.set('ALL');
        this.clientEmailQuery.set('');
        this.selectedClientEmail.set('');
        this.fromDate.set('');
        this.toDate.set('');
        this.loadOrders();
    }

    applyClientEmailFilter(event: Event): void {
        event.preventDefault();
        const email = this.clientEmailQuery().trim();
        this.selectedClientEmail.set(email);
        this.loadOrders(email || undefined);
    }

    logout(): void {
        this.auth.signOut();
        this.router.navigate(['/']);
    }

    private loadOrders(clientEmail?: string): void {
        this.loadingOrders.set(true);
        this.loadError.set(null);
        const request = clientEmail
            ? this.trading.getOrdersByClientEmail(clientEmail)
            : this.trading.getAllOrders();

        request.subscribe({
            next: orders => {
                this.orders.set(orders);
                this.loadingOrders.set(false);
            },
            error: error => {
                console.error('Error fetching admin trade logs:', error);
                this.loadingOrders.set(false);
                this.loadError.set('Unable to load trade logs.');
            },
        });
    }

    private matchesFilters(order: Order): boolean {
        const instrument = (order.instrument ?? 'STOCK').toUpperCase();
        const executedAt = order.executedAt ? new Date(order.executedAt) : null;
        const toDate = this.toDate() ? new Date(`${this.toDate()}T00:00:00`) : null;
        if (toDate) {
            toDate.setDate(toDate.getDate() + 1);
        }

        if (this.selectedInstrument() !== 'ALL' && instrument !== this.selectedInstrument()) {
            return false;
        }
        if (this.selectedSide() !== 'ALL' && order.orderType !== this.selectedSide()) {
            return false;
        }
        if (this.selectedStatus() !== 'ALL' && order.status !== this.selectedStatus()) {
            return false;
        }
        if (this.fromDate() && (!executedAt || executedAt < new Date(`${this.fromDate()}T00:00:00`))) {
            return false;
        }
        if (toDate && (!executedAt || executedAt >= toDate)) {
            return false;
        }
        return true;
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
            instrument: (order.instrument ?? 'STOCK') as InstrumentType,
            status: order.status,
        };
    }
}
