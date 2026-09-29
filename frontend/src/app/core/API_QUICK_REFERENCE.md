# API Integration Quick Reference

## ✅ API Endpoints Status - All Verified

### Base URL
```
http://10.23.137.152:8099
```

---

## Market Data Service

**Service:** `MarketDataService`  
**Location:** `src/app/core/services/market-data.service.ts`

### Available Methods

```typescript
// Get stock quote
getQuote(symbol: string): Observable<StockQuote>
// GET /api/v1/market/quotes/{symbol}

// Get historical candles
getCandles(symbol: string, query?: CandleQuery): Observable<CandleResponse>
// GET /api/v1/market/candles/{symbol}?from=YYYY-MM-DD&to=YYYY-MM-DD

// Get bid-ask spread
getSpread(symbol: string): Observable<SpreadInfo>
// GET /api/v1/market/spread/{symbol}

// Get price changes
getPriceChange(symbol: string): Observable<PriceChange>
// GET /api/v1/market/changes/{symbol}

// Get current price
getCurrentPrice(symbol: string): Observable<PriceData>
// GET /api/v1/market/price/{symbol}

// Check market health
checkMarketHealth(): Observable<string>
// GET /api/v1/market/health

// Get market usage stats
getMarketUsage(): Observable<unknown>
// GET /api/v1/market/usage

// Clear cache
clearCache(): Observable<SuccessResponse>
// POST /api/v1/market/cache/clear

// Get cache stats
getCacheStats(): Observable<CacheStats>
// GET /api/v1/market/cache/stats
```

### Reactive Signals

```typescript
currentQuote: Signal<StockQuote | null>
currentCandles: Signal<CandleResponse | null>
marketHealth: Signal<string | null>
isLoading: Signal<boolean>
error: Signal<string | null>
```

### Example Usage

```typescript
import { Component, inject } from '@angular/core';
import { MarketDataService } from '../../core/services/market-data.service';

@Component({
  selector: 'app-stock-quote',
  template: `
    <div *ngIf="market.isLoading()">Loading...</div>
    <div *ngIf="market.currentQuote() as quote">
      <h2>{{ quote.symbol }}</h2>
      <p>Price: ${{ quote.price }}</p>
      <p>Change: {{ quote.changePercent }}%</p>
    </div>
    <div *ngIf="market.error()">{{ market.error() }}</div>
  `
})
export class StockQuoteComponent {
  market = inject(MarketDataService);

  ngOnInit() {
    this.market.loadQuote('AAPL').subscribe();
  }
}
```

---

## Trading Service

**Service:** `TradingService`  
**Location:** `src/app/core/services/trading.service.ts`

### Available Methods

```typescript
// Client Management
loadClient(clientId: string): Observable<Client>
// GET /api/clients?clientId={clientId}

getClient(clientId: string): Observable<Client>
// GET /api/clients?clientId={clientId}

getClients(): Observable<Client[]>
// GET /api/clients

updateClient(clientId: string, request: ClientRequest): Observable<Client>
// PUT /api/clients?clientId={clientId}

// Holdings Management
loadHoldings(clientId: string): Observable<Holding[]>
// GET /api/holdings?clientId={clientId}

getHoldings(clientId: string): Observable<Holding[]>
// GET /api/holdings?clientId={clientId}

getTotalPortfolioValue(): number
// Calculated from holdings

getTotalUnrealizedGain(): number
// Calculated from holdings

findHolding(symbol: string): Holding | undefined
// Find holding by symbol

// Orders & Transactions
loadOrders(clientId: string): Observable<Order[]>
// GET /api/orders?clientId={clientId}

getOrders(clientId: string): Observable<Order[]>
// GET /api/orders?clientId={clientId}

submitOrder(request: OrderRequest): Observable<OrderResponse>
// POST /api/orders/transact

getFilledOrders(): Order[]
// Filter by status=FILLED

getPendingOrders(): Order[]
// Filter by status=PENDING or SUBMITTED

// Bulk Operations
loadAllClientData(clientId: string): Observable<[Client, Holding[], Order[]]>
// Load profile + holdings + orders in parallel
```

### Reactive Signals

```typescript
currentClient: Signal<Client | null>
holdings: Signal<Holding[]>
orders: Signal<Order[]>
isLoading: Signal<boolean>
error: Signal<string | null>
```

### Example Usage

```typescript
import { Component, inject } from '@angular/core';
import { TradingService } from '../../core/services/trading.service';

@Component({
  selector: 'app-portfolio',
  template: `
    <div *ngIf="trading.isLoading()">Loading portfolio...</div>
    <div *ngIf="trading.currentClient() as client">
      <h2>{{ client.name }}</h2>
      <p>Total Value: ${{ trading.getTotalPortfolioValue() }}</p>
    </div>
    <div>
      <h3>Holdings</h3>
      <div *ngFor="let holding of trading.holdings()">
        <p>{{ holding.symbol }}: {{ holding.quantity }} shares</p>
        <p>Current Value: ${{ holding.currentValue }}</p>
      </div>
    </div>
  `
})
export class PortfolioComponent {
  trading = inject(TradingService);

  ngOnInit() {
    const clientId = 'fake-user-uuid-12345'; // From auth service
    this.trading.loadAllClientData(clientId).subscribe();
  }

  submitBuyOrder(symbol: string, quantity: number) {
    this.trading.submitOrder({
      clientId: 'fake-user-uuid-12345',
      symbol,
      quantity,
      transactionType: 'BUY'
    }).subscribe({
      next: (response) => {
        console.log('Order submitted:', response.orderId);
        // Holdings auto-reload
      },
      error: (err) => {
        console.error('Order failed:', this.trading.error());
      }
    });
  }
}
```

---

## API Service (Direct Access)

**Service:** `ApiService`  
**Location:** `src/app/core/services/api.service.ts`

For direct access to individual endpoints not covered by MarketDataService or TradingService.

### Generic Methods

```typescript
get<T>(path: string, params?: Record<string, string | number | boolean>): Observable<T>
post<T>(path: string, body: unknown): Observable<T>
put<T>(path: string, body: unknown, params?: Record<string, string | number | boolean>): Observable<T>
delete<T>(path: string): Observable<T>
```

### Legacy User Endpoints

```typescript
getUsers(): Observable<User[]>
// GET /api/users

getUser(id: number): Observable<User>
// GET /api/users/{id}
```

---

## Data Models

All responses are strongly typed. Key interfaces:

### Market Data
```typescript
StockQuote {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  asOf: string;        // ISO 8601
  change: number;
  changePercent: number;
  currency: string;
  marketState: string;
  previousClose: number;
  spreadBps: number;   // basis points
}

Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: string;   // ISO 8601
}

CandleResponse {
  symbol: string;
  candles: Candle[];
}
```

### Client/Holdings/Orders
```typescript
Client {
  id: string;          // UUID
  name: string;
  email: string;
}

Holding {
  clientId: string;    // UUID
  symbol: string;
  quantity: string;    // numeric string
  avgBuyPrice: string; // numeric string
  currentValue: string; // numeric string
}

Order {
  id: string;          // UUID
  clientId: string;    // UUID
  symbol: string;
  quantity: number;
  orderType: 'BUY' | 'SELL';
  status: 'FILLED' | 'PENDING' | 'SUBMITTED' | 'CANCELLED' | 'REJECTED';
  executedAt?: string; // ISO 8601
}

OrderRequest {
  clientId: string;
  symbol: string;
  quantity: number;
  transactionType: 'BUY' | 'SELL';
}

OrderResponse {
  orderId: string;
  clientId: string;
  symbol: string;
  quantity: string;
  transactionType: 'BUY' | 'SELL';
  status: OrderStatus;
  createdAt: string;   // ISO 8601
}
```

---

## Error Handling Pattern

All services follow this error pattern:

```typescript
service.loadSomething(id).subscribe({
  next: (data) => {
    // Use data from signals
    console.log(service.currentData());
  },
  error: (err) => {
    // Error is automatically stored in service.error() signal
    console.error(service.error());
  }
});

// Clear error
service.clearError();
```

---

## Authentication

**Service:** `AuthService`  
**Location:** `src/app/core/services/auth.service.ts`

Currently stubbed with fake data (Supabase removed):

```typescript
// Demo user: fake-user-uuid-12345
// Email: demo@eatrading.local
// Name: Demo Trader
// Balance: $50,000
// isAdmin: true

// Sign in (stubbed - returns success)
auth.signIn(email, password)

// Sign up (stubbed - returns success)
auth.signUp(email, password, name)

// Sign out
auth.signOut()

// Signals
auth.user: Signal<AuthUser | null>
auth.session: Signal<Session | null>
auth.profile: Signal<UserProfile | null>
auth.isAdmin: Signal<boolean>
auth.loading: Signal<boolean>
```

### Example

```typescript
import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-header',
  template: `
    <div *ngIf="auth.user() as user">
      <p>{{ user.email }}</p>
      <button (click)="logout()">Logout</button>
    </div>
  `
})
export class HeaderComponent {
  auth = inject(AuthService);

  async logout() {
    await this.auth.signOut();
    // Router redirects handled elsewhere
  }
}
```

---

## Development Notes

✅ **All endpoints verified and working**  
✅ **Type-safe service methods**  
✅ **Reactive signals for state management**  
✅ **Built-in error handling and loading states**  
✅ **No authentication required (all endpoints public)**  
✅ **CORS enabled on backend**  

### To Use in Components

1. **Inject service:** `private service = inject(MarketDataService);`
2. **Load data:** `this.service.loadQuote('AAPL').subscribe();`
3. **Access via signals:** `{{ service.currentQuote().price }}`
4. **Handle errors:** `{{ service.error() }}`
5. **Check loading:** `*ngIf="service.isLoading()"`

---

## API Documentation

- **Swagger UI:** http://10.23.137.152:8099/swagger-ui.html
- **OpenAPI Spec:** http://10.23.137.152:8099/v3/api-docs
- **Backend Repo:** /home/ec2-user/ea-trading/EATrading-Backend
