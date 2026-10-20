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
        return this.apiService.getHoldings(clientId);
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
            map((orders) => orders.map((order) => this.normalizeOrder(order))),
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
        return this.apiService.getOrders(clientId).pipe(map((orders) => orders.map((order) => this.normalizeOrder(order))));
    }

    getAllOrders(): Observable<Order[]> {
        return this.apiService.getAllOrders().pipe(
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

    private normalizeOrder(order: Order | OrderTransactionResponse): Order {
        const raw = order as (Order | OrderTransactionResponse) & {
            id?: string;
            orderId?: string;
            trackingId?: string;
            buy?: boolean;
            orderDate?: string;
            executedAt?: string;
            name?: string;
            currentStatus?: OrderStatus;
            asset?: { symbol?: string; name?: string };
            transactionType?: TransactionType;
        };

        return {
            ...order,
            id: raw.id ?? raw.orderId ?? raw.trackingId ?? '',
            trackingId: raw.trackingId,
            symbol: raw.asset?.symbol ?? raw.symbol,
            name: raw.asset?.name ?? raw.name,
            quantity: typeof raw.quantity === 'string' ? Number(raw.quantity) || 0 : raw.quantity,
            orderType: raw.transactionType
                ?? (raw.buy === undefined ? raw.orderType : raw.buy ? 'BUY' : 'SELL'),
            status: raw.currentStatus ?? raw.status,
            executedAt: raw.executedAt ?? raw.orderDate,
        };
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
