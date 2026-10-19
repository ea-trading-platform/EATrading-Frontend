/**
 * EA Trading Platform - TypeScript Models
 * Auto-generated from API documentation
 */

// ============================================================================
// MARKET DATA MODELS
// ============================================================================

/**
 * Stock quote with current price and market metrics
 */
export interface StockQuote {
    symbol: string;
    price: number;
    bid: number;
    ask: number;
    asOf: string; // ISO 8601 timestamp
    change: number;
    changePercent: number;
    currency: string;
    marketState: string;
    previousClose: number;
    spreadBps: number; // basis points
}

/**
 * Single candlestick OHLCV data point
 */
export interface Candle {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    timestamp?: string; // ISO 8601 timestamp
    date?: string; // YYYY-MM-DD, used by the market candles endpoint
    adjclose?: number;
    synthetic?: boolean;
}

/**
 * Historical price data (candles)
 */
export interface CandleResponse {
    symbol: string;
    candles: Candle[];
    data?: {
        symbol: string;
        interval: string;
        currency: string;
        candles: Candle[];
    };
}

/**
 * Bid-ask spread information
 */
export interface SpreadInfo {
    spread: number;
    spreadBps: number;
}

/**
 * Price change metrics
 */
export interface PriceChange {
    change: number;
    changePercent: number;
    previousClose: number;
}

/**
 * Current price data
 */
export interface PriceData {
    symbol: string;
    price: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
    cachedQuotes: number;
}

/**
 * Generic success response
 */
export interface SuccessResponse {
    status: string;
    message: string;
}

// ============================================================================
// CLIENT MANAGEMENT MODELS
// ============================================================================

/**
 * Client profile (from User entity with portfolio reference)
 */
export interface Client {
    id: string; // UUID field - primary identifier for frontend
    name: string;
    email: string;
    portfolioId?: number;
    totalBalance?: number;
    createdAt?: string;
    updatedAt?: string;
}

/**
 * Request body for creating/updating a client
 */
export interface ClientRequest {
    name: string;
    email: string;
}

/** Current portfolio and available cash summary. */
export interface PortfolioSummary {
    clientId: string;
    availableCashUsd: string | number;
    portfolioValueUsd: string | number;
    investedValueUsd?: string | number;
    overallReturnUsd?: string | number;
    overallReturnPercent?: string | number;
    dailyChangeUsd?: string | number;
    dailyChangePercent?: string | number;
    asOf?: string;
}

export interface PortfolioHistoryPoint {
    timestamp: string;
    portfolioValueUsd: string | number;
    cashValueUsd: string | number;
    investedValueUsd: string | number;
    dailyChangeUsd: string | number;
}

export interface PortfolioHistory {
    clientId: string;
    from: string;
    to: string;
    interval: string;
    points: PortfolioHistoryPoint[];
}

// ============================================================================
// HOLDINGS MODELS
// ============================================================================

/**
 * Client stock holding
 */
export interface Holding {
    clientId: string; // UUID
    symbol: string;
    name?: string;
    instrument?: 'CASH' | 'EQUITY' | 'CRYPTO' | string;
    quantity: string; // numeric string
    avgBuyPrice: string; // numeric string
    currentValue: string; // numeric string
}

/**
 * Holding summary with calculated metrics
 */
export interface HoldingSummary extends Holding {
    currentPrice?: number;
    unrealizedGain?: number;
    unrealizedGainPercent?: number;
}

// ============================================================================
// ORDERS MODELS
// ============================================================================

/**
 * Order status enum
 */
export type OrderStatus = 'FILLED' | 'PENDING' | 'SUBMITTED' | 'ACCEPTED' | 'CANCELLED' | 'CANCELED' | 'REJECTED';

/**
 * Transaction type enum
 */
export type TransactionType = 'BUY' | 'SELL';

/**
 * Client order/transaction
 */
export interface Order {
    id: string; // UUID
    trackingId?: string;
    clientId: string; // UUID
    symbol: string;
    name?: string;
    quantity: number;
    orderType: TransactionType;
    status: OrderStatus;
    executedAt?: string; // ISO 8601 timestamp
    price?: number;
}

/**
 * Request body for creating an order
 */
export interface OrderRequest {
    clientId: string; // UUID
    symbol: string;
    name: string;
    quantity: number;
    transactionType: TransactionType;
}

/**
 * Order response after creation
 */
export interface OrderResponse {
    trackingId: string;
}

// ============================================================================
// WATCHLIST MODELS
// ============================================================================

/**
 * Watchlist item response returned by backend endpoints.
 */
export interface WatchlistItemResponse {
    symbol: string;
    name: string;
    currentPrice: number;
    priceChange: number;
    percentChange: number;
    timestamp: string;
}

// ============================================================================
// ERROR MODELS
// ============================================================================

/**
 * API error response format
 */
export interface ApiError {
    error: string;
    message: string;
    timestamp: string; // ISO 8601 timestamp
    status: number;
}

// ============================================================================
// QUERY PARAMETERS
// ============================================================================

/**
 * Query parameters for candles endpoint
 */
export interface CandleQuery {
    from?: string; // YYYY-MM-DD format, defaults to 30 days ago
    to?: string; // YYYY-MM-DD format, defaults to today
}
