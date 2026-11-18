export type OrderType = 'MARKET' | 'LIMIT';
/** Sides a user can submit through the orders endpoint (CASH_IN/CASH_OUT are not exposed). */
export type TradeSide = 'BUY' | 'SELL';
export type OrderStatus = 'NEW' | 'FILLED' | 'REJECTED' | 'CANCELLED';

/** The instrument type used to model cash (ARS); it cannot be traded. */
export const CASH_INSTRUMENT_TYPE = 'MONEDA';

/** What the user asks for, already validated. */
export interface OrderRequest {
  userId: number;
  instrumentId: number;
  side: TradeSide;
  type: OrderType;
  /** Exact number of shares. Exactly one of `size` / `amount` is set. */
  size?: number;
  /** Total pesos to invest; the number of whole shares is derived from it. */
  amount?: number;
  /** Limit price. Only meaningful (and required) for LIMIT orders. */
  price?: number;
}

/** An order ready to be persisted. */
export interface NewOrder {
  userId: number;
  instrumentId: number;
  side: TradeSide;
  type: OrderType;
  size: number;
  /** Execution price (MARKET: latest close) or limit price (LIMIT). */
  price: number;
  status: 'NEW' | 'FILLED' | 'REJECTED';
  datetime: Date;
}

export interface PlacedOrder extends Omit<NewOrder, 'status'> {
  id: number;
  status: OrderStatus;
}
