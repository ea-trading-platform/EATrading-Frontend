export type OrderAction = 'BUY' | 'SELL';
export type OrderStatus = 'PENDING' | 'COMPLETED' | 'CANCELED';
export type InstrumentType = 'STOCK' | 'FX' | 'ETF';

export interface OrdersTable {
    action: OrderAction;
    symbol: string;
    name: string;
    transactionDate: Date;
    shares: number;
    price: number;
    instrument: InstrumentType;
    status: OrderStatus;
}