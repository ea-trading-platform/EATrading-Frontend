import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { OrderAnalyticsFilters, OrderAnalyticsResponse, OrderStatus, TransactionType } from '../../../../core/models/trading.models';
import { AuthService } from '../../../../core/services/auth.service';
import { TradingService } from '../../../../core/services/trading.service';
import { TopBar } from '../../../components/top-bar/top-bar';
import { ADMIN_NAV_ITEMS } from '../admin-navigation';
import { OrderAnalyticsChart } from '../components/order-analytics-chart/order-analytics-chart';

@Component({
    selector: 'app-admin-analytics',
    standalone: true,
    imports: [DecimalPipe, FormsModule, TopBar, OrderAnalyticsChart],
    templateUrl: './admin-analytics.html',
    styleUrls: ['../admin-dashboard.css', './admin-analytics.css'],
})
export class AdminAnalytics implements OnInit {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly trading = inject(TradingService);
    private readonly destroyRef = inject(DestroyRef);
    private request?: Subscription;

    readonly navItems = ADMIN_NAV_ITEMS;
    readonly instruments = ['CASH', 'EQUITY', 'CRYPTO'] as const;
    readonly sides: readonly TransactionType[] = ['BUY', 'SELL'];
    readonly statuses: readonly OrderStatus[] = ['SUBMITTED', 'ACCEPTED', 'FILLED', 'CANCELED', 'REJECTED'];
    readonly analytics = signal<OrderAnalyticsResponse | null>(null);
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);
    fromDate = '';
    toDate = '';
    instrument: NonNullable<OrderAnalyticsFilters['instrument']> | '' = '';
    side: TransactionType | '' = '';
    status: OrderStatus | '' = '';

    ngOnInit(): void {
        this.applyFilters();
    }

    applyFilters(): void {
        const from = this.fromDate ? new Date(`${this.fromDate}T00:00:00`) : undefined;
        const to = this.toDate ? new Date(`${this.toDate}T00:00:00`) : undefined;
        if ((from && !Number.isFinite(from.getTime())) || (to && !Number.isFinite(to.getTime()))) {
            this.error.set('Enter valid dates.');
            return;
        }
        if (from && to && from > to) {
            this.error.set('The From date must be on or before the To date.');
            return;
        }
        // The backend uses an exclusive upper bound; include the selected To day.
        to?.setDate(to.getDate() + 1);
        const filters: OrderAnalyticsFilters = {
            // clientId: clientId || undefined,
            from: from?.toISOString(),
            to: to?.toISOString(),
            instrument: this.instrument || undefined,
            side: this.side || undefined,
            status: this.status || undefined,
        };

        this.request?.unsubscribe();
        this.loading.set(true);
        this.error.set(null);
        this.analytics.set(null);
        this.request = this.trading.getOrderAnalytics(filters)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: analytics => {
                    this.analytics.set(analytics);
                    this.loading.set(false);
                },
                error: error => {
                    console.error('Error fetching admin order analytics:', error);
                    this.loading.set(false);
                    this.error.set('Unable to load order analytics. Please try again.');
                },
            });
    }

    clearFilters(): void {
        this.fromDate = '';
        this.toDate = '';
        this.instrument = '';
        this.side = '';
        this.status = '';
        this.applyFilters();
    }

    async logout(): Promise<void> {
        await this.auth.signOut();
        await this.router.navigate(['/']);
    }
}
