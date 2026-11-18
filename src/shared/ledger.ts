export type OrderSide = 'BUY' | 'SELL' | 'CASH_IN' | 'CASH_OUT';

/** A FILLED movement of a user's account (framework-free, shared by several features). */
export interface LedgerEntry {
  instrumentId: number;
  side: OrderSide;
  /** Shares for BUY/SELL, pesos for CASH_IN/CASH_OUT. */
  size: number;
  /** Price per share. Not used for CASH_IN/CASH_OUT. */
  price: number;
}

/** Rounds to 2 decimals (and normalizes -0 to 0). */
export const round2 = (n: number): number =>
  Math.round((n + Number.EPSILON) * 100) / 100 + 0;

/**
 * Pesos available: CASH_IN +size, CASH_OUT -size, SELL +size*price, BUY -size*price.
 * Entries must be FILLED orders only. Not rounded.
 */
export function availableCash(entries: readonly LedgerEntry[]): number {
  let cash = 0;
  for (const e of entries) {
    switch (e.side) {
      case 'CASH_IN':
        cash += e.size;
        break;
      case 'CASH_OUT':
        cash -= e.size;
        break;
      case 'BUY':
        cash -= e.size * e.price;
        break;
      case 'SELL':
        cash += e.size * e.price;
        break;
    }
  }
  return cash;
}

/** Net shares of an instrument: sum(BUY) - sum(SELL). Can be negative. */
export function netQuantity(
  entries: readonly LedgerEntry[],
  instrumentId: number,
): number {
  let quantity = 0;
  for (const e of entries) {
    if (e.instrumentId !== instrumentId) continue;
    if (e.side === 'BUY') quantity += e.size;
    else if (e.side === 'SELL') quantity -= e.size;
  }
  return quantity;
}
