export type OrderSide = 'BUY' | 'SELL' | 'CASH_IN' | 'CASH_OUT';

/** A FILLED order, enriched with the data of its instrument. */
export interface FilledOrder {
  instrumentId: number;
  ticker: string;
  name: string;
  /** e.g. 'ACCIONES' or 'MONEDA' (cash). */
  instrumentType: string;
  side: OrderSide;
  /** Shares for BUY/SELL, pesos for CASH_IN/CASH_OUT. */
  size: number;
  /** Price per share. Not used for CASH_IN/CASH_OUT. */
  price: number;
}
