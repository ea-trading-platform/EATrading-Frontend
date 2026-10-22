export type OrderAction = 'BUY' | 'SELL';
export type OrderStatus =
    | 'FILLED'
    | 'SUBMITTED'
    | 'ACCEPTED'
    | 'CANCELED'
    | 'REJECTED';
export type InstrumentType = 'CASH' | 'EQUITY' | 'CRYPTO';

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