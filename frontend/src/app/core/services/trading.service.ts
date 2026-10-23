import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, tap } from 'rxjs';
import { ApiService } from './api.service';
import {
    Client,
    ClientRequest,
    Holding,
    PortfolioHistory,
    PortfolioSummary,
    Order,
    OrderAnalyticsResponse,
    OrderAnalyticsFilters,
    OrderTransactionResponse,
    OrderRequest,
    OrderResponse,
    OrderStatus,
    TransactionType,
} from '../models/trading.models';

/**
 * Service for managing client portfolio, holdings, and orders.
 * Handles client profile, stock holdings, and transaction operations.
 */
@Injectable({ providedIn: 'root' })
export class TradingService {
    private readonly apiService = inject(ApiService);

    // ========================================================================
    // SIGNALS FOR REACTIVE STATE
    // ========================================================================

    /**
     * Current client profile
     */
    currentClient = signal<Client | null>(null);

    /**
     * Client's stock holdings
     */
    holdings = signal<Holding[]>([]);

    /**
     * Client's orders/transaction history
     */
    orders = signal<Order[]>([]);

    /**
     * Loading state
     */
    isLoading = signal(false);

    /**
     * Error message if any
     */
    error = signal<string | null>(null);

    // ========================================================================
    // CLIENT MANAGEMENT
    // ========================================================================

    /**
     * Fetch a client by ID and cache in signal
     */
    loadClient(clientId: string): Observable<Client> {
        this.isLoading.set(true);
        this.error.set(null);

        return this.apiService.getClient(clientId).pipe(
            tap((client) => {
                this.currentClient.set(client);
                this.isLoading.set(false);
            }),
            catchError((err) => {
                this.error.set(err?.message || 'Failed to load client');
                this.isLoading.set(false);
                throw err;
            })
        );
    }

    /**
     * Fetch client without caching
     */
    getClient(clientId: string): Observable<Client> {
        return this.apiService.getClient(clientId);
    }

    getClientByEmail(clientEmail: string): Observable<Client> {
        return this.apiService.getClientByEmail(clientEmail);
    }

    getPortfolioSummary(clientId: string): Observable<PortfolioSummary> {
        return this.apiService.getPortfolioSummary(clientId);
    }

    getPortfolioHistory(clientId: string, from: string, to: string): Observable<PortfolioHistory> {
        return this.apiService.getPortfolioHistory(clientId, from, to);
    }

    /**
     * Get all clients (admin operation)
     */
    getClients(): Observable<Client[]> {
        return this.apiService.getClients();
    }

    /**
     * Update client profile
     */
    updateClient(clientId: string, request: ClientRequest): Observable<Client> {
        return this.apiService.updateClient(clientId, request).pipe(
            tap((client) => {
                // Update cached client if it matches
                if (this.currentClient()?.id === clientId) {
                    this.currentClient.set(client);
                }
            }),
            catchError((err) => {
                this.error.set(err?.message || 'Failed to update client');
                throw err;
            })
        );
    }

    // ========================================================================
    // HOLDINGS MANAGEMENT
    // ========================================================================

    /**
     * Load client holdings and cache in signal
     */
    loadHoldings(clientId: string): Observable<Holding[]> {
        this.isLoading.set(true);
        this.error.set(null);

        return this.apiService.getHoldings(clientId).pipe(
            map((holdings) => holdings.filter((holding) => !this.isUsdCashHolding(holding))),
            tap((holdings) => {
                this.holdings.set(holdings);
                this.isLoading.set(false);
            }),
            catchError((err) => {
                this.error.set(err?.message || 'Failed to load holdings');
                this.isLoading.set(false);
                throw err;
            })
        );
    }

    /**
     * Fetch holdings without caching
     */
    getHoldings(clientId: string): Observable<Holding[]> {
        return this.apiService.getHoldings(clientId).pipe(
            map((holdings) => holdings.filter((holding) => !this.isUsdCashHolding(holding))),
        );
    }

    /**
     * Get total portfolio value from holdings
     */
    getTotalPortfolioValue(): number {
        return this.holdings().reduce((total, holding) => {
            const value = parseFloat(holding.currentValue) || 0;
            return total + value;
        }, 0);
    }

    /**
     * Get total unrealized gains/losses
     */
    getTotalUnrealizedGain(): number {
        return this.holdings().reduce((total, holding) => {
            const current = parseFloat(holding.currentValue) || 0;
            const invested = parseFloat(holding.avgBuyPrice) * parseFloat(holding.quantity) || 0;
            return total + (current - invested);
        }, 0);
    }

    /**
     * Find a specific holding by symbol
     */
    findHolding(symbol: string): Holding | undefined {
        return this.holdings().find((h) => h.symbol.toUpperCase() === symbol.toUpperCase());
    }

    // ========================================================================
    // ORDERS & TRANSACTIONS
    // ========================================================================

    /**
     * Load client orders and cache in signal
     */
    loadOrders(clientId: string): Observable<Order[]> {
        this.isLoading.set(true);
        this.error.set(null);

        return this.apiService.getOrders(clientId).pipe(
            map((orders) => orders
                .map((order) => this.normalizeOrder(order))
                .filter((order) => order.symbol.trim().toUpperCase() !== 'USD')),
            tap((orders) => {
                this.orders.set(orders);
                this.isLoading.set(false);
            }),
            catchError((err) => {
                this.error.set(err?.message || 'Failed to load orders');
                this.isLoading.set(false);
                throw err;
            })
        );
    }

    /**
     * Fetch orders without caching
     */
    getOrders(clientId: string): Observable<Order[]> {
        return this.apiService.getOrders(clientId).pipe(
            map((orders) => orders
                .map((order) => this.normalizeOrder(order))
                .filter((order) => order.symbol.trim().toUpperCase() !== 'USD')),
        );
    }

    getAllOrders(): Observable<Order[]> {
        return this.apiService.getAllOrders().pipe(
            map((orders) => orders.map((order) => this.normalizeOrder(order))),
        );
    }

    getOrderAnalytics(filters: OrderAnalyticsFilters = {}): Observable<OrderAnalyticsResponse> {
        return this.apiService.getOrderAnalytics(filters);
    }

    getOrdersByClientEmail(clientEmail: string): Observable<Order[]> {
        return this.apiService.getOrdersByClientEmail(clientEmail).pipe(
            map((orders) => orders.map((order) => this.normalizeOrder(order))),
        );
    }

    getOrdersByInstrument(instrument: string): Observable<Order[]> {
        return this.apiService.getOrdersByInstrument(instrument).pipe(
            map((orders) => orders.map((order) => this.normalizeOrder(order))),
        );
    }

    getOrdersBySide(side: 'BUY' | 'SELL'): Observable<Order[]> {
        return this.apiService.getOrdersBySide(side).pipe(
            map((orders) => orders.map((order) => this.normalizeOrder(order))),
        );
    }

    getOrdersByStatus(status: string): Observable<Order[]> {
        return this.apiService.getOrdersByStatus(status).pipe(
            map((orders) => orders.map((order) => this.normalizeOrder(order))),
        );
    }

    getOrdersByDateRange(from: string, to: string): Observable<Order[]> {
        return this.apiService.getOrdersByDateRange(from, to).pipe(
            map((orders) => orders.map((order) => this.normalizeOrder(order))),
        );
    }

    /**
     * Submit a new buy/sell order
     */
    submitOrder(request: OrderRequest): Observable<OrderResponse> {
        this.isLoading.set(true);
        this.error.set(null);

        return this.apiService.createOrder(request).pipe(
            tap((response) => {
                this.isLoading.set(false);
            }),
            catchError((err) => {
                this.error.set(err?.message || 'Failed to submit order');
                this.isLoading.set(false);
                throw err;
            })
        );
    }

    cancelOrder(trackingId: string): Observable<void> {
        this.isLoading.set(true);
        this.error.set(null);

        return this.apiService.cancelOrder(trackingId).pipe(
            tap(() => this.isLoading.set(false)),
            catchError((err) => {
                this.error.set(err?.message || 'Failed to cancel order');
                this.isLoading.set(false);
                throw err;
            }),
        );
    }

    private normalizeOrder(order: Order | OrderTransactionResponse): Order {
        const raw = order as OrderTransactionResponse & Partial<Order> & {
            orderId?: string;
            trackingId?: string;
            buy?: boolean;
            action?: string;
            side?: string;
            type?: string;
            orderDate?: string;
            executedAt?: string;
            currentStatus?: OrderStatus;
            name?: string | null;
            instrumentName?: string | null;
            companyName?: string | null;
            averagePrice?: number | string | null;
            avgPrice?: number | string | null;
            executedPrice?: number | string | null;
            filledPrice?: number | string | null;
            fillPrice?: number | string | null;
            limitPrice?: number | string | null;
            assetPrice?: number | string | null;
            asset?: { symbol?: string; name?: string };
        };

        const normalizedStatus = raw.currentStatus ?? raw.status;
        const normalizedAction = raw.buy === undefined
            ? raw.orderType ?? this.normalizeTransactionType(raw.transactionType ?? raw.action ?? raw.side ?? raw.type)
            : raw.buy ? 'BUY' : 'SELL';
        const normalizedName = raw.asset?.name
            ?? raw.name
            ?? raw.instrumentName
            ?? raw.companyName
            ?? normalizedStatus;
        const normalizedPrice = this.coercePrice(
            raw.price,
            raw.executedPrice,
            raw.filledPrice,
            raw.fillPrice,
            raw.averagePrice,
            raw.avgPrice,
            raw.limitPrice,
            raw.assetPrice,
        );

        return {
            ...order,
            id: raw.id ?? raw.orderId ?? raw.trackingId ?? '',
            trackingId: raw.trackingId,
            symbol: raw.asset?.symbol ?? raw.symbol,
            name: normalizedName,
            quantity: this.coerceQuantity(raw.quantity),
            orderType: normalizedAction ?? 'BUY',
            status: normalizedStatus,
            executedAt: raw.executedAt ?? raw.orderDate,
            price: normalizedPrice,
        };
    }

    private normalizeTransactionType(value?: string): 'BUY' | 'SELL' | undefined {
        if (!value) {
            return undefined;
        }

        const normalizedValue = value.trim().toUpperCase();
        if (normalizedValue === 'BUY' || normalizedValue === 'SELL') {
            return normalizedValue;
        }
        return undefined;
    }

    private coercePrice(...values: Array<number | string | null | undefined>): number | undefined {
        for (const value of values) {
            if (typeof value === 'number' && Number.isFinite(value)) {
                return value;
            }
            if (typeof value === 'string') {
                const parsed = Number(value);
                if (Number.isFinite(parsed)) {
                    return parsed;
                }
            }
        }
        return undefined;
    }

    private coerceQuantity(value: number | string | null | undefined): number {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }
        if (typeof value === 'string') {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) {
                return parsed;
            }
        }
        return 0;
    }

    private isUsdCashHolding(holding: Holding): boolean {
        return holding.symbol.trim().toUpperCase() === 'USD';
    }

    /**
     * Get filled orders (execution completed)
     */
    getFilledOrders(): Order[] {
        return this.orders().filter((o) => o.status === 'FILLED');
    }


    // ========================================================================
    // STATE MANAGEMENT
    // ========================================================================

    /**
     * Clear all cached data
     */
    clearCache(): void {
        this.currentClient.set(null);
        this.holdings.set([]);
        this.orders.set([]);
        this.error.set(null);
    }

    /**
     * Clear error state
     */
    clearError(): void {
        this.error.set(null);
    }

    /**
     * Load all client data (profile, holdings, orders)
     */
    loadAllClientData(clientId: string): Observable<[Client, Holding[], Order[]]> {
        return new Observable((subscriber) => {
            let completed = 0;
            const results: [Client | undefined, Holding[] | undefined, Order[] | undefined] = [
                undefined,
                undefined,
                undefined
            ];

            this.loadClient(clientId).subscribe({
                next: (client) => {
                    results[0] = client;
                    completed++;
                    if (completed === 3) {
                        subscriber.next(results as [Client, Holding[], Order[]]);
                        subscriber.complete();
                    }
                },
                error: (err) => subscriber.error(err)
            });

            this.loadHoldings(clientId).subscribe({
                next: (holdings) => {
                    results[1] = holdings;
                    completed++;
                    if (completed === 3) {
                        subscriber.next(results as [Client, Holding[], Order[]]);
                        subscriber.complete();
                    }
                },
                error: (err) => subscriber.error(err)
            });

            this.loadOrders(clientId).subscribe({
                next: (orders) => {
                    results[2] = orders;
                    completed++;
                    if (completed === 3) {
                        subscriber.next(results as [Client, Holding[], Order[]]);
                        subscriber.complete();
                    }
                },
                error: (err) => subscriber.error(err)
            });
        });
    }
}
