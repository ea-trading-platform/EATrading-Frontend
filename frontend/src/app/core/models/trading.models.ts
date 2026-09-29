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
    timestamp: string; // ISO 8601 timestamp
}

/**
 * Historical price data (candles)
 */
export interface CandleResponse {
    symbol: string;
    candles: Candle[];
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

// ============================================================================
// HOLDINGS MODELS
// ============================================================================

/**
 * Client stock holding
 */
export interface Holding {
    clientId: string; // UUID
    symbol: string;
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
export type OrderStatus = 'FILLED' | 'PENDING' | 'CANCELLED' | 'REJECTED' | 'SUBMITTED';

/**
 * Transaction type enum
 */
export type TransactionType = 'BUY' | 'SELL';

/**
 * Client order/transaction
 */
export interface Order {
    id: string; // UUID
    clientId: string; // UUID
    symbol: string;
    quantity: number;
    orderType: TransactionType;
    status: OrderStatus;
    executedAt?: string; // ISO 8601 timestamp
}

/**
 * Request body for creating an order
 */
export interface OrderRequest {
    clientId: string; // UUID
    symbol: string;
    quantity: number;
    transactionType: TransactionType;
}

/**
 * Order response after creation
 */
export interface OrderResponse {
    orderId: string; // UUID
    clientId: string; // UUID
    symbol: string;
    quantity: string; // numeric string
    transactionType: TransactionType;
    status: OrderStatus;
    createdAt: string; // ISO 8601 timestamp
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
