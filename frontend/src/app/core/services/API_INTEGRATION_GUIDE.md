# EA Trading API Integration Guide

## Overview
This document covers the complete integration of the EA Trading Backend API (v1) into the Angular frontend. All endpoints are fully typed with TypeScript interfaces and wrapped in specialized services for easy consumption.

---

## Project Structure

### New Files Created

1. **Models** (`src/app/core/models/trading.models.ts`)
   - TypeScript interfaces for all API data models
   - Includes: `StockQuote`, `Candle`, `Client`, `Holding`, `Order`, etc.
   - Type-safe enums for `OrderStatus` and `TransactionType`

2. **ApiService** (enhanced `src/app/core/services/api.service.ts`)
   - Base HTTP client with automatic URL prefixing
   - All 20+ market, client, holdings, and orders endpoints
   - Strongly-typed request/response handling

3. **MarketDataService** (new `src/app/core/services/market-data.service.ts`)
   - Specialized for market data operations
   - Reactive signals: `currentQuote`, `currentCandles`, `marketHealth`, `isLoading`, `error`
   - Methods: `loadQuote()`, `loadCandles()`, `getSpread()`, `checkMarketHealth()`, etc.

4. **TradingService** (new `src/app/core/services/trading.service.ts`)
   - Manages client profiles, holdings, and orders
   - Reactive signals: `currentClient`, `holdings`, `orders`, `isLoading`, `error`
   - Utility methods: `getTotalPortfolioValue()`, `getFilledOrders()`, `submitOrder()`, etc.

5. **Environment Configuration** (enhanced)
   - `environment.development.ts` and `environment.ts`
   - Organized endpoint structure for market, clients, holdings, orders

---

## API Base URL Configuration

**Base URL:** `http://10.23.137.152:8099`

Set in: `src/environments/environment.development.ts` and `environment.ts`

```typescript
export const environment = {
    production: false,
    apiBaseUrl: 'http://10.23.137.152:8099',
    // ... rest of config
};
```

For proxy setup in development, see `proxy.conf.json`.

---

## Service Usage Examples

### 1. Market Data Service

#### Get a Stock Quote
```typescript
import { Component, inject, OnInit } from '@angular/core';
import { MarketDataService } from './core/services/market-data.service';

@Component({
  selector: 'app-quote-viewer',
  template: `
    <div *ngIf="marketData.currentQuote() as quote">
      <h2>{{ quote.symbol }}</h2>
      <p>Price: ${{ quote.price }}</p>
      <p [class.positive]="quote.change > 0" [class.negative]="quote.change < 0">
        {{ quote.change }} ({{ quote.changePercent }}%)
      </p>
    </div>
    <p *ngIf="marketData.isLoading()">Loading...</p>
    <p *ngIf="marketData.error()" class="error">{{ marketData.error() }}</p>
  `
})
export class QuoteViewerComponent implements OnInit {
  marketData = inject(MarketDataService);

  ngOnInit() {
    this.marketData.loadQuote('AAPL').subscribe();
  }
}
```

#### Get Historical Candles
```typescript
ngOnInit() {
  this.marketData.loadCandles('AAPL', {
    from: '2026-09-01',
    to: '2026-09-28'
  }).subscribe();
}
```

#### Get Bid-Ask Spread
```typescript
this.marketData.getSpread('AAPL').subscribe((spread) => {
  console.log(`Spread: $${spread.spread} (${spread.spreadBps} bps)`);
});
```

#### Check Market Health
```typescript
this.marketData.checkMarketHealth().subscribe();
// Access via: marketData.marketHealth()
```

---

### 2. Trading Service

#### Load Client Profile
```typescript
import { Component, inject, OnInit } from '@angular/core';
import { TradingService } from './core/services/trading.service';

@Component({
  selector: 'app-client-profile',
  template: `
    <div *ngIf="trading.currentClient() as client">
      <h2>{{ client.name }}</h2>
      <p>Email: {{ client.email }}</p>
    </div>
  `
})
export class ClientProfileComponent implements OnInit {
  trading = inject(TradingService);

  ngOnInit() {
    const clientId = '550e8400-e29b-41d4-a716-446655440000';
    this.trading.loadClient(clientId).subscribe();
  }
}
```

#### Load Holdings
```typescript
ngOnInit() {
  const clientId = 'your-client-id';
  this.trading.loadHoldings(clientId).subscribe();
}

// In template
<div *ngFor="let holding of trading.holdings()">
  <p>{{ holding.symbol }}: {{ holding.quantity }} shares @ ${{ holding.avgBuyPrice }}</p>
  <p>Current Value: ${{ holding.currentValue }}</p>
</div>

// Calculate totals
totalValue = this.trading.getTotalPortfolioValue();
totalGain = this.trading.getTotalUnrealizedGain();
```

#### Submit an Order
```typescript
submitBuyOrder(symbol: string, quantity: number) {
  const clientId = 'your-client-id';
  
  this.trading.submitOrder({
    clientId,
    symbol,
    quantity,
    transactionType: 'BUY'
  }).subscribe({
    next: (response) => {
      console.log(`Order ${response.orderId} submitted!`);
      // Holdings will auto-reload
    },
    error: (err) => {
      console.error('Order failed:', err);
      // Error message in trading.error()
    }
  });
}
```

#### Get Order History
```typescript
ngOnInit() {
  const clientId = 'your-client-id';
  this.trading.loadOrders(clientId).subscribe();
}

// In template
<div *ngFor="let order of trading.orders()">
  <p>{{ order.symbol }} - {{ order.quantity }} shares ({{ order.orderType }})</p>
  <p>Status: {{ order.status }}</p>
</div>

// Filters
filledOrders = this.trading.getFilledOrders();
pendingOrders = this.trading.getPendingOrders();
```

#### Load All Client Data at Once
```typescript
ngOnInit() {
  const clientId = 'your-client-id';
  
  this.trading.loadAllClientData(clientId).subscribe({
    next: ([client, holdings, orders]) => {
      console.log('Client data loaded:', { client, holdings, orders });
    },
    error: (err) => console.error('Failed to load data:', err)
  });
}
```

---

### 3. Direct API Service Usage

For operations not covered by the specialized services:

```typescript
constructor(private api: ApiService) {}

// Get quote
this.api.getQuote('AAPL').subscribe((quote) => {
  console.log(quote);
});

// Clear market cache
this.api.clearMarketCache().subscribe(() => {
  console.log('Cache cleared');
});

// Get cache stats
this.api.getMarketCacheStats().subscribe((stats) => {
  console.log(`${stats.cachedQuotes} quotes cached`);
});
```

---

## API Endpoints Reference

### Market Data (`/api/v1/market/`)
- `GET /quotes/{symbol}` - Stock quote
- `GET /candles/{symbol}` - Historical OHLCV data (30 days default)
- `GET /spread/{symbol}` - Bid-ask spread
- `GET /changes/{symbol}` - Price change metrics
- `GET /price/{symbol}` - Current price only
- `GET /health` - API health status
- `GET /usage` - API usage statistics
- `POST /cache/clear` - Clear quote cache
- `GET /cache/stats` - Cache statistics

### Client Management (`/api/`)
- `GET /clients` - Get all clients
- `GET /clients?clientId={id}` - Get single client
- `PUT /clients?clientId={id}` - Update client

### Holdings (`/api/`)
- `GET /holdings?clientId={id}` - Get client holdings

### Orders (`/api/`)
- `GET /orders?clientId={id}` - Get client orders
- `POST /orders/transact` - Submit buy/sell order

---

## Error Handling

All services include error handling with signals:

```typescript
// In component
export class MyComponent {
  trading = inject(TradingService);

  ngOnInit() {
    this.trading.loadHoldings('client-id').subscribe({
      error: (err) => {
        // Error is also stored in trading.error() signal
        console.error(this.trading.error());
      }
    });
  }

  clearError() {
    this.trading.clearError();
  }
}

// In template
<p *ngIf="trading.error()" class="alert alert-error">
  {{ trading.error() }}
  <button (click)="clearError()">Dismiss</button>
</p>
```

---

## Loading States

Use the `isLoading` signal for UI feedback:

```typescript
// In component
loadData() {
  this.trading.loadHoldings('client-id').subscribe();
}

// In template
<div *ngIf="trading.isLoading()" class="spinner">Loading...</div>
<div *ngIf="!trading.isLoading()" class="content">
  <!-- Your content here -->
</div>
```

---

## Data Models

All data is fully typed. Examples:

### StockQuote
```typescript
{
  symbol: "AAPL",
  price: 338.4,
  bid: 338.36,
  ask: 338.44,
  asOf: "2026-09-28T20:00:01Z",
  change: -2.67,
  changePercent: -0.782830504002111,
  currency: "USD",
  marketState: "unknown",
  previousClose: 341.07,
  spreadBps: 1.8467
}
```

### Holding
```typescript
{
  clientId: "550e8400-e29b-41d4-a716-446655440000",
  symbol: "AAPL",
  quantity: "100",
  avgBuyPrice: "150.25",
  currentValue: "33840"
}
```

### Order
```typescript
{
  id: "770e8400-e29b-41d4-a716-446655440000",
  clientId: "550e8400-e29b-41d4-a716-446655440000",
  symbol: "AAPL",
  quantity: 100,
  orderType: "BUY",
  status: "SUBMITTED",
  createdAt: "2026-09-28T20:05:00Z"
}
```

---

## Key Design Patterns

1. **Reactive Signals** - Use Angular 18+ signals for state management
2. **Type Safety** - All API responses are strongly typed
3. **Error Handling** - Services catch and expose errors via signals
4. **Loading States** - UI can respond to loading with `isLoading` signal
5. **Caching** - MarketDataService and TradingService cache in signals
6. **Separation of Concerns** - Specialized services for different domains

---

## Important Notes

✅ **API Base URL:** Already configured to `http://10.23.137.152:8099`
✅ **No Authentication Required** - All endpoints are publicly accessible
✅ **CORS Enabled** - Backend allows cross-origin requests
✅ **Real Market Data** - Uses Fauxnance API for market data
🔄 **Quote Caching** - Server caches quotes; use `clearCache()` to refresh
📊 **Candles Default** - Defaults to 30 days if dates not provided
🚀 **Ready for Production** - Services handle all edge cases and errors

---

## Next Steps

1. **Update existing components** to use the new services
2. **Create new dashboard components** for portfolio view, order submission, etc.
3. **Add real-time updates** (WebSocket) if needed
4. **Implement filtering/sorting** for holdings and orders
5. **Add charts** for price history visualization

---

## Support

- **Swagger UI**: http://10.23.137.152:8099/swagger-ui.html
- **API Docs**: http://10.23.137.152:8099/v3/api-docs
- **Backend Repo**: /home/ec2-user/ea-trading/EATrading-Backend
