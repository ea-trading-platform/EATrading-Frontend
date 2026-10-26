# EA Trading Backend API Reference

## Base Configuration
- **Base URL**: `http://10.23.137.152:8099`
- **Port**: 8099
- **Authentication**: None required
- **CORS**: Enabled for all origins (*)

---

## Market Data Endpoints

### Get Stock Quote
```http
GET /api/v1/market/quotes/{symbol}
```

**Example:**
```bash
curl "http://10.23.137.152:8099/api/v1/market/quotes/AAPL"
```

**Response:**
```json
{
  "symbol": "AAPL",
  "price": 338.4,
  "bid": 338.36,
  "ask": 338.44,
  "asOf": "2026-09-28T20:00:01Z",
  "change": -2.67,
  "changePercent": -0.782830504002111,
  "currency": "USD",
  "marketState": "unknown",
  "previousClose": 341.07,
  "spreadBps": 1.8467
}
```

---

### Get Candles (OHLCV Data)
```http
GET /api/v1/market/candles/{symbol}?from=2026-09-01&to=2026-09-28
```

**Parameters:**
- `symbol` (required): Stock ticker symbol
- `from` (optional): Start date (YYYY-MM-DD), defaults to 30 days ago
- `to` (optional): End date (YYYY-MM-DD), defaults to today

**Example:**
```bash
curl "http://10.23.137.152:8099/api/v1/market/candles/AAPL?from=2026-09-01&to=2026-09-28"
```

**Response:**
```json
{
  "symbol": "AAPL",
  "candles": [
    {
      "open": 340.0,
      "high": 342.5,
      "low": 338.2,
      "close": 341.07,
      "volume": 1000000,
      "timestamp": "2026-09-28T00:00:00Z"
    }
  ]
}
```

---

### Get Bid-Ask Spread
```http
GET /api/v1/market/spread/{symbol}
```

**Example:**
```bash
curl "http://10.23.137.152:8099/api/v1/market/spread/AAPL"
```

**Response:**
```json
{
  "spread": 0.08,
  "spreadBps": 1.8467
}
```

---

### Get Price Changes
```http
GET /api/v1/market/changes/{symbol}
```

**Example:**
```bash
curl "http://10.23.137.152:8099/api/v1/market/changes/AAPL"
```

**Response:**
```json
{
  "change": -2.67,
  "changePercent": -0.782830504002111,
  "previousClose": 341.07
}
```

---

### Get Current Price
```http
GET /api/v1/market/price/{symbol}
```

**Example:**
```bash
curl "http://10.23.137.152:8099/api/v1/market/price/AAPL"
```

**Response:**
```json
{
  "symbol": "AAPL",
  "price": 338.4
}
```

---

### Market API Health
```http
GET /api/v1/market/health
```

**Example:**
```bash
curl "http://10.23.137.152:8099/api/v1/market/health"
```

**Response:**
```
"UP"
```

---

### Get API Usage
```http
GET /api/v1/market/usage
```

**Example:**
```bash
curl "http://10.23.137.152:8099/api/v1/market/usage"
```

---

### Clear Cache
```http
POST /api/v1/market/cache/clear
```

**Example:**
```bash
curl -X POST "http://10.23.137.152:8099/api/v1/market/cache/clear"
```

**Response:**
```json
{
  "status": "success",
  "message": "Cache cleared"
}
```

---

### Get Cache Stats
```http
GET /api/v1/market/cache/stats
```

**Example:**
```bash
curl "http://10.23.137.152:8099/api/v1/market/cache/stats"
```

**Response:**
```json
{
  "cachedQuotes": 42
}
```

---

## Client Management Endpoints

### Get All Clients
```http
GET /api/clients
```

**Example:**
```bash
curl "http://10.23.137.152:8099/api/clients"
```

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Jane Smith",
    "email": "jane@example.com"
  }
]
```

---

### Get Client by ID
```http
GET /api/clients?clientId={clientId}
```

**Example:**
```bash
curl "http://10.23.137.152:8099/api/clients?clientId=550e8400-e29b-41d4-a716-446655440000"
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Doe",
  "email": "john@example.com"
}
```

---

### Update Client
```http
PUT /api/clients?clientId={clientId}
Content-Type: application/json
```

**Example:**
```bash
curl -X PUT "http://10.23.137.152:8099/api/clients?clientId=550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com"
  }'
```

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

---

## Portfolio Endpoints

### Get Current Portfolio Summary
```http
GET /api/portfolio?clientId={clientId}
```

**Response:**
```json
{
  "clientId": "550e8400-e29b-41d4-a716-446655440000",
  "availableCashUsd": "1250.00",
  "portfolioValueUsd": "10350.25",
  "investedValueUsd": "9000.00",
  "overallReturnUsd": "1350.25",
  "overallReturnPercent": "15.00",
  "dailyChangeUsd": "125.40",
  "dailyChangePercent": "1.22",
  "asOf": "2026-10-14T20:00:00Z"
}
```

Only the USD cash holding contributes to `availableCashUsd`. Foreign cash,
forex, equities, and crypto are included in `portfolioValueUsd` after USD
conversion.

## Orders and Transactions

Orders are processed asynchronously. The frontend creates an order, receives a
tracking ID, and then reads the client's orders until the order reaches a final
status.

### Order Lifecycle

```text
POST /api/orders
        |
        v
    SUBMITTED
        |
        +--> ACCEPTED --> FILLED
        |
        +--> REJECTED
        |
        +--> CANCELED
```

- `SUBMITTED`: The request was accepted and queued. It may still be waiting for
  validation, or may be queued because the market is closed.
- `ACCEPTED`: Validation passed and the order is queued for execution.
- `FILLED`: Execution completed and holdings/cash were updated.
- `REJECTED`: Validation failed, for example because the client lacks enough
  cash for a BUY or enough shares for a SELL.
- `CANCELED`: The order was canceled before validation. Only `SUBMITTED`
  orders can be canceled.

### Create an Order

```http
POST /api/orders
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request body:**

```json
{
  "clientId": "550e8400-e29b-41d4-a716-446655440000",
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "transactionType": "BUY",
  "quantity": "10"
}
```

`transactionType` must be exactly `BUY` or `SELL`. `quantity` must be greater
than zero. The API obtains the current market price on the server when it
creates the order; the frontend does not send a price.

The authenticated client ID from the JWT is used as the order owner. The
`clientId` field must still be present and contain a valid UUID for request
validation.

**Response: `201 Created`**

```text
550e8400-e29b-41d4-a716-446655440099
```

The response body is the order's `trackingId`, not the database `orderId`.
Store it so the frontend can identify the order while polling.

**Example:**

```bash
curl -X POST "http://10.23.137.152:8099/api/orders" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "550e8400-e29b-41d4-a716-446655440000",
    "symbol": "AAPL",
    "name": "Apple Inc.",
    "transactionType": "BUY",
    "quantity": "10"
  }'
```

### Get Client Orders

Use this endpoint to poll for the result of a newly submitted order. There is
currently no single-order endpoint, so filter the response by `trackingId` on
the frontend.

```http
GET /api/orders?clientId={clientId}
Authorization: Bearer <jwt>
```

**Example:**

```bash
curl "http://10.23.137.152:8099/api/orders?clientId=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer $JWT"
```

The response is an array of orders. Relevant fields include:

```json
[
  {
    "orderId": "550e8400-e29b-41d4-a716-446655440010",
    "trackingId": "550e8400-e29b-41d4-a716-446655440099",
    "clientId": "550e8400-e29b-41d4-a716-446655440000",
    "buy": true,
    "orderDate": "2026-10-16T14:30:00Z",
    "price": 238.45,
    "quantity": 10,
    "currentStatus": "FILLED",
    "asset": {
      "symbol": "AAPL",
      "name": "APPLE INC.",
      "instrument": "EQUITY"
    },
    "baseMarket": "UNCAT"
  }
]
```

For a BUY, `buy` is `true`; for a SELL, `buy` is `false`. The `price` is the
server-side market price captured when the order entered the system.

### Cancel an Order

```http
PATCH /api/orders/{trackingId}
Authorization: Bearer <jwt>
```

No request body is required.

**Example:**

```bash
curl -X PATCH "http://10.23.137.152:8099/api/orders/550e8400-e29b-41d4-a716-446655440099" \
  -H "Authorization: Bearer $JWT"
```

**Response: `200 OK`**

```json
{
  "status": "success",
  "message": "Order canceled successfully",
  "trackingId": "550e8400-e29b-41d4-a716-446655440099",
  "currentStatus": "CANCELED"
}
```

Cancellation returns an error if the order is not owned by the authenticated
client, does not exist, or has already moved beyond `SUBMITTED`.

### Recommended Frontend Flow

1. Display the current quote with `GET /api/v1/market/quotes/{symbol}`.
2. Submit BUY or SELL with `POST /api/orders`.
3. Save the returned `trackingId`.
4. Poll `GET /api/orders?clientId={clientId}` and find the matching tracking ID.
5. Refresh holdings with `GET /api/holdings?clientId={clientId}` and the
   portfolio with `GET /api/portfolio?clientId={clientId}` after `FILLED`.
6. Offer cancellation only while the order status is `SUBMITTED`.

### Get Portfolio History
```http
GET /api/portfolio/history?clientId={clientId}&from=2026-01-01&to=2026-10-14
```

**Response:**
```json
{
  "clientId": "550e8400-e29b-41d4-a716-446655440000",
  "from": "2026-01-01",
  "to": "2026-10-14",
  "interval": "1d",
  "points": [
    {
      "timestamp": "2026-10-13T20:00:00Z",
      "portfolioValueUsd": "10350.25",
      "cashValueUsd": "1250.00",
      "investedValueUsd": "9100.25",
      "dailyChangeUsd": "125.40"
    }
  ]
}
```

Dates are inclusive and timestamps are UTC. An empty result returns an empty
`points` array. History contains scheduled end-of-day snapshots and may also
contain points created after successful trades.

---

## Holdings Endpoints

### Get Client Holdings
```http
GET /api/holdings?clientId={clientId}
```

**Example:**
```bash
curl "http://10.23.137.152:8099/api/holdings?clientId=550e8400-e29b-41d4-a716-446655440000"
```

**Response:**
```json
[
  {
    "clientId": "550e8400-e29b-41d4-a716-446655440000",
    "symbol": "AAPL",
    "name": "Apple Inc.",
    "instrument": "EQUITY",
    "quantity": "100",
    "avgBuyPrice": "150.25",
    "currentPrice": "338.40",
    "currentValue": "33840.00",
    "dailyChange": "120.00",
    "dailyChangePercent": "1.17",
    "unrealizedReturn": "187.50",
    "unrealizedReturnPercent": "1.25"
  },
  {
    "clientId": "550e8400-e29b-41d4-a716-446655440000",
    "symbol": "MSFT",
    "name": "Microsoft Corporation",
    "instrument": "EQUITY",
    "quantity": "50",
    "avgBuyPrice": "300.00",
    "currentPrice": "330.00",
    "currentValue": "16500.00",
    "dailyChange": "75.00",
    "dailyChangePercent": "0.92",
    "unrealizedReturn": "1500.00",
    "unrealizedReturnPercent": "10.00"
  }
]
```

---

## Orders Endpoints

### Get Orders by Client
```http
GET /api/orders?clientId={clientId}
```

**Example:**
```bash
curl "http://10.23.137.152:8099/api/orders?clientId=550e8400-e29b-41d4-a716-446655440000"
```

**Response:**
```json
[
  {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "clientId": "550e8400-e29b-41d4-a716-446655440000",
    "symbol": "AAPL",
    "quantity": 100,
    "orderType": "BUY",
    "status": "FILLED",
    "executedAt": "2026-09-28T10:30:00Z"
  }
]
```

---

### Create Transaction Order
```http
POST /api/orders/transact
Content-Type: application/json
```

**Example:**
```bash
curl -X POST "http://10.23.137.152:8099/api/orders/transact" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "550e8400-e29b-41d4-a716-446655440000",
    "symbol": "AAPL",
    "quantity": 100,
    "transactionType": "BUY"
  }'
```

**Request Body:**
```json
{
  "clientId": "550e8400-e29b-41d4-a716-446655440000",
  "symbol": "AAPL",
  "quantity": 100,
  "transactionType": "BUY"
}
```

**Response:**
```json
{
  "orderId": "770e8400-e29b-41d4-a716-446655440000",
  "clientId": "550e8400-e29b-41d4-a716-446655440000",
  "symbol": "AAPL",
  "quantity": "100",
  "transactionType": "BUY",
  "status": "SUBMITTED",
  "createdAt": "2026-09-28T20:05:00Z"
}
```

---

## Interactive Testing

### Swagger UI
Access the interactive API documentation at:
```
http://10.23.137.152:8099/swagger-ui.html
```

### OpenAPI Spec
```
http://10.23.137.152:8099/v3/api-docs
```

---

## Angular Service Implementation

### Environment Configuration
**environment.ts (Development):**
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://10.23.137.152:8099'
};
```

**environment.prod.ts (Production):**
```typescript
export const environment = {
  production: true,
  apiUrl: 'http://10.23.137.152:8099'
};
```

---

## Component Usage Examples

### Get Stock Quote
```typescript
import { Component, OnInit } from '@angular/core';
import { EATradingService } from './services/eatrading.service';

@Component({
  selector: 'app-quote',
  template: `
    <div *ngIf="quote">
      <h2>{{ quote.symbol }}</h2>
      <p>Price: ${{ quote.price }}</p>
      <p>Change: {{ quote.change }} ({{ quote.changePercent }}%)</p>
    </div>
  `
})
export class QuoteComponent implements OnInit {
  quote: any;

  constructor(private service: EATradingService) {}

  ngOnInit() {
    this.service.getQuote('AAPL').subscribe(data => {
      this.quote = data;
    });
  }
}
```

### Get Candles Chart
```typescript
import { Component, OnInit } from '@angular/core';
import { EATradingService } from './services/eatrading.service';

@Component({
  selector: 'app-chart',
  template: `
    <div *ngIf="candles">
      <h2>{{ candles.symbol }} - 30 Days</h2>
      <div *ngFor="let candle of candles.candles">
        <p>{{ candle.timestamp }}: O:{{ candle.open }} H:{{ candle.high }} L:{{ candle.low }} C:{{ candle.close }}</p>
      </div>
    </div>
  `
})
export class ChartComponent implements OnInit {
  candles: any;

  constructor(private service: EATradingService) {}

  ngOnInit() {
    this.service.getCandles('AAPL').subscribe(data => {
      this.candles = data;
    });
  }
}
```

### Create Order
```typescript
import { Component } from '@angular/core';
import { EATradingService } from './services/eatrading.service';

@Component({
  selector: 'app-order',
  template: `
    <form (ngSubmit)="submitOrder()">
      <input [(ngModel)]="symbol" placeholder="Symbol" name="symbol" />
      <input [(ngModel)]="quantity" placeholder="Quantity" name="quantity" type="number" />
      <select [(ngModel)]="orderType" name="orderType">
        <option value="BUY">Buy</option>
        <option value="SELL">Sell</option>
      </select>
      <button type="submit">Submit Order</button>
    </form>
    <div *ngIf="orderResponse">
      <p>Order {{ orderResponse.orderId }} submitted!</p>
    </div>
  `
})
export class OrderComponent {
  symbol = '';
  quantity = 0;
  orderType = 'BUY';
  orderResponse: any;
  clientId = '550e8400-e29b-41d4-a716-446655440000'; // Replace with actual client ID

  constructor(private service: EATradingService) {}

  submitOrder() {
    this.service.createOrder(this.clientId, this.symbol, this.quantity, this.orderType)
      .subscribe(response => {
        this.orderResponse = response;
      });
  }
}
```

---

## Error Handling

### Common HTTP Status Codes
- `200` - OK: Request successful
- `201` - Created: Resource created successfully
- `400` - Bad Request: Invalid parameters
- `404` - Not Found: Resource not found
- `500` - Internal Server Error: Server error

### Error Response Format
```json
{
  "error": "Error Message",
  "message": "Detailed error message",
  "timestamp": "2026-09-28T20:05:35.506361846Z",
  "status": 400
}
```

---

## Important Notes

✅ **No authentication required** - all endpoints are publicly accessible
✅ **CORS enabled** - can be called from any origin
✅ **Real market data** - uses Fauxnance API for market data
🔄 **Quote caching** - quotes are cached, use `/cache/clear` to refresh
📊 **30-day default** - candles endpoint defaults to last 30 days if dates not provided
🚀 **HTTPS ready** - update URLs to https:// for production

---

## Support & Documentation

- **Swagger UI**: http://10.23.137.152:8099/swagger-ui.html
- **API Docs**: http://10.23.137.152:8099/v3/api-docs
- **Repository**: /home/ec2-user/ea-trading/EATrading-Backend
