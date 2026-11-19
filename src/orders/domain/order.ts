import { OrderSide } from '../../shared/ledger';

export const ORDER_TYPES = ['MARKET', 'LIMIT'] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

/** Sides a user can submit through the orders endpoint (CASH_IN/CASH_OUT are not exposed). */
export const TRADE_SIDES = ['BUY', 'SELL'] as const;
export type TradeSide = (typeof TRADE_SIDES)[number];

export type OrderStatus = 'NEW' | 'FILLED' | 'REJECTED' | 'CANCELLED';

/** How much to trade: an exact number of shares, or the pesos to invest. */
export type OrderQuantity = { size: number } | { amount: number };

/**
 * A validated request to place an order. MARKET orders carry no price (they execute at
 * the latest close); LIMIT orders always carry one.
 */
export type PlaceOrderCommand = {
  userId: number;
  instrumentId: number;
  side: TradeSide;
  quantity: OrderQuantity;
} & ({ type: 'MARKET' } | { type: 'LIMIT'; price: number });

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

/**
 * An order stored in the database. Orders placed through the API are BUY/SELL, but one
 * read back by id can also be a cash movement (CASH_IN/CASH_OUT), hence `OrderSide`.
 */
export interface PlacedOrder extends Omit<NewOrder, 'status' | 'side'> {
  id: number;
  side: OrderSide;
  status: OrderStatus;
}
