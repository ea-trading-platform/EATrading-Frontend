import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
    StockQuote,
    CandleResponse,
    SpreadInfo,
    PriceChange,
    PriceData,
    CacheStats,
    SuccessResponse,
    Client,
    ClientRequest,
    Holding,
    Order,
    OrderRequest,
    OrderResponse,
    CandleQuery
} from '../models/trading.models';

/**
 * User information parsed from the API
 */
export interface User {
    id?: number;
    uuid?: string;
    name?: string | null;
    totalBalance?: number;
    [key: string]: unknown;
}

/**
 * Thin wrapper around HttpClient that prefixes every call with the configured
 * backend host. Change the host by editing `apiUrl` in the environment
 * files under src/environments/ - nothing else needs to change.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiBaseUrl;

    get<T>(path: string, params?: Record<string, string | number | boolean>): Observable<T> {
        return this.http.get<T>(this.buildUrl(path), { params: this.buildParams(params) });
    }

    post<T>(path: string, body: unknown): Observable<T> {
        return this.http.post<T>(this.buildUrl(path), body);
    }

    put<T>(path: string, body: unknown, params?: Record<string, string | number | boolean>): Observable<T> {
        return this.http.put<T>(this.buildUrl(path), body, { params: this.buildParams(params) });
    }

    delete<T>(path: string): Observable<T> {
        return this.http.delete<T>(this.buildUrl(path));
    }

    /**
     * Fetch users from the API
     */
    getUsers(): Observable<User[]> {
        return this.get<User[]>('/api/users');
    }

    /**
     * Fetch a single user by their numeric database ID
     */
    getUser(id: number): Observable<User> {
        return this.get<User>(`/api/users/${id}`);
    }

    // ========================================================================
    // MARKET DATA ENDPOINTS
    // ========================================================================

    /**
     * Get stock quote by symbol
     * GET /api/v1/market/quotes/{symbol}
     */
    getQuote(symbol: string): Observable<StockQuote> {
        return this.get<StockQuote>(`/api/v1/market/quotes/${symbol}`);
    }

    /**
     * Get historical candles (OHLCV) for a stock
     * GET /api/v1/market/candles/{symbol}?from=YYYY-MM-DD&to=YYYY-MM-DD
     */
    getCandles(symbol: string, query?: CandleQuery): Observable<CandleResponse> {
        const params: Record<string, string | number | boolean> = {};
        if (query?.from) params['from'] = query.from;
        if (query?.to) params['to'] = query.to;
        return this.get<CandleResponse>(`/api/v1/market/candles/${symbol}`, Object.keys(params).length > 0 ? params : undefined);
    }

    /**
     * Get bid-ask spread for a stock
     * GET /api/v1/market/spread/{symbol}
     */
    getSpread(symbol: string): Observable<SpreadInfo> {
        return this.get<SpreadInfo>(`/api/v1/market/spread/${symbol}`);
    }

    /**
     * Get price change metrics for a stock
     * GET /api/v1/market/changes/{symbol}
     */
    getPriceChange(symbol: string): Observable<PriceChange> {
        return this.get<PriceChange>(`/api/v1/market/changes/${symbol}`);
    }

    /**
     * Get current price for a stock
     * GET /api/v1/market/price/{symbol}
     */
    getCurrentPrice(symbol: string): Observable<PriceData> {
        return this.get<PriceData>(`/api/v1/market/price/${symbol}`);
    }

    /**
     * Check market data API health
     * GET /api/v1/market/health
     */
    getMarketHealth(): Observable<string> {
        return this.get<string>(`/api/v1/market/health`);
    }

    /**
     * Get API usage statistics
     * GET /api/v1/market/usage
     */
    getMarketUsage(): Observable<unknown> {
        return this.get<unknown>(`/api/v1/market/usage`);
    }

    /**
     * Clear quote cache
     * POST /api/v1/market/cache/clear
     */
    clearMarketCache(): Observable<SuccessResponse> {
        return this.post<SuccessResponse>(`/api/v1/market/cache/clear`, {});
    }

    /**
     * Get cache statistics
     * GET /api/v1/market/cache/stats
     */
    getMarketCacheStats(): Observable<CacheStats> {
        return this.get<CacheStats>(`/api/v1/market/cache/stats`);
    }

    // ========================================================================
    // CLIENT MANAGEMENT ENDPOINTS
    // ========================================================================

    /**
     * Get all clients
     * GET /api/clients
     */
    getClients(): Observable<Client[]> {
        return this.get<Client[]>(`/api/clients`);
    }

    /**
     * Get a single client by ID
     * GET /api/clients?clientId={clientId}
     */
    getClient(clientId: string): Observable<Client> {
        return this.get<Client>(`/api/clients`, { clientId });
    }

    /**
     * Update a client
     * PUT /api/clients?clientId={clientId}
     */
    updateClient(clientId: string, request: ClientRequest): Observable<Client> {
        return this.put<Client>(`/api/clients`, request, { clientId });
    }

    // ========================================================================
    // HOLDINGS ENDPOINTS
    // ========================================================================

    /**
     * Get all holdings for a client
     * GET /api/holdings?clientId={clientId}
     */
    getHoldings(clientId: string): Observable<Holding[]> {
        return this.get<Holding[]>(`/api/holdings`, { clientId });
    }

    // ========================================================================
    // ORDERS ENDPOINTS
    // ========================================================================

    /**
     * Get all orders for a client
     * GET /api/orders?clientId={clientId}
     */
    getOrders(clientId: string): Observable<Order[]> {
        return this.get<Order[]>(`/api/orders`, { clientId });
    }

    /**
     * Create a new order/transaction
     * POST /api/orders/transact
     */
    createOrder(request: OrderRequest): Observable<OrderResponse> {
        return this.post<OrderResponse>(`/api/orders/transact`, request);
    }

    private buildUrl(path: string): string {
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        return `${this.baseUrl}${normalizedPath}`;
    }

    private buildParams(params?: Record<string, string | number | boolean>): HttpParams {
        let httpParams = new HttpParams();
        for (const [key, value] of Object.entries(params ?? {})) {
            httpParams = httpParams.set(key, value);
        }
        return httpParams;
    }
}
