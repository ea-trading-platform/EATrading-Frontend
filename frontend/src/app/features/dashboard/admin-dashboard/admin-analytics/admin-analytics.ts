import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { OrderAnalyticsFilters, OrderAnalyticsResponse, OrderStatus, TradeInterval, TransactionType } from '../../../../core/models/trading.models';
import { AuthService } from '../../../../core/services/auth.service';
import { TradingService } from '../../../../core/services/trading.service';
import { TopBar } from '../../../components/top-bar/top-bar';
import { ADMIN_NAV_ITEMS } from '../admin-navigation';
import { OrderAnalyticsChart } from '../components/order-analytics-chart/order-analytics-chart';
import { BarChartComponent } from '../../components/bar-chart/bar-chart';

type AnalyticsRange = '1D' | '1W' | '1M' | '1Y' | 'ALL' | 'CUSTOM';

@Component({
    selector: 'app-admin-analytics',
    standalone: true,
    imports: [DecimalPipe, FormsModule, TopBar, OrderAnalyticsChart, BarChartComponent],
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
    readonly customIntervals: readonly { value: TradeInterval; label: string }[] = [
        { value: 'hour', label: 'Hourly' },
        { value: 'day', label: 'Daily' },
        { value: 'week', label: 'Weekly' },
    ];
    readonly ranges: readonly { value: AnalyticsRange; label: string }[] = [
        { value: '1D', label: '24 hours (1 day)' },
        { value: '1W', label: '1 week' },
        { value: '1M', label: '1 month' },
        { value: '1Y', label: '1 year' },
        { value: 'ALL', label: 'All time' },
        { value: 'CUSTOM', label: 'Custom dates' },
    ];
    readonly analytics = signal<OrderAnalyticsResponse | null>(null);
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);
    readonly chartInterval = signal<TradeInterval>('hour');
    range: AnalyticsRange = '1D';
    customInterval: TradeInterval = 'day';
    fromDate = '';
    toDate = '';
    instrument: NonNullable<OrderAnalyticsFilters['instrument']> | '' = '';
    side: TransactionType | '' = '';
    status: OrderStatus | '' = '';

    onRangeChange(value: string): void {
        const range = this.ranges.find(option => option.value === value)?.value;
        if (!range) {
            this.error.set('Select a valid time range.');
            return;
        }
        this.range = range;
        if (range !== 'CUSTOM') {
            this.applyFilters();
        }
    }

    ngOnInit(): void {
        this.applyFilters();
    }

    applyFilters(): void {
        const to = new Date();
        let from: Date;
        const interval = this.intervalForRange();

        switch (this.range) {
            case '1D':
                from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '1W':
                from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '1M':
                from = this.subtractUtcMonths(to, 1);
                break;
            case '1Y':
                from = this.subtractUtcMonths(to, 12);
                break;
            case 'ALL':
                from = new Date('1970-01-01T00:00:00.000Z');
                break;
            case 'CUSTOM':
                from = this.fromDate ? new Date(this.fromDate) : new Date(NaN);
                const customTo = this.toDate ? new Date(this.toDate) : new Date(NaN);
                if (!Number.isFinite(from.getTime()) || !Number.isFinite(customTo.getTime())) {
                    this.error.set('Enter valid start and end date-times for a custom range.');
                    return;
                }
                if (from >= customTo) {
                    this.error.set('The start date-time must be before the end date-time.');
                    return;
                }
                to.setTime(customTo.getTime());
                break;
        }

        if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) {
            this.error.set('Enter valid dates.');
            return;
        }
        const filters: OrderAnalyticsFilters = {
            from: from.toISOString(),
            to: to.toISOString(),
            interval,
            instrument: this.instrument || undefined,
            side: this.side || undefined,
            status: this.status || undefined,
        };

        this.request?.unsubscribe();
        this.chartInterval.set(interval);
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
        this.range = '1D';
        this.customInterval = 'day';
        this.fromDate = '';
        this.toDate = '';
        this.instrument = '';
        this.side = '';
        this.status = '';
        this.applyFilters();
    }

    private subtractUtcMonths(date: Date, months: number): Date {
        const result = new Date(date);
        const day = result.getUTCDate();
        result.setUTCDate(1);
        result.setUTCMonth(result.getUTCMonth() - months);
        const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
        result.setUTCDate(Math.min(day, lastDay));
        return result;
    }

    private intervalForRange(): TradeInterval {
        switch (this.range) {
            case '1D': return 'hour';
            case '1W':
            case '1M':
                return 'day';
            case '1Y':
            case 'ALL': return 'week';
            case 'CUSTOM': return this.customInterval;
        }
    }

    async logout(): Promise<void> {
        await this.auth.signOut();
        await this.router.navigate(['/']);
    }
}
