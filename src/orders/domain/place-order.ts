import {
  availableCash,
  LedgerEntry,
  netQuantity,
  round2,
} from '../../shared/ledger';
import { InvalidOrderError } from './errors';
import { OrderQuantity, TradeSide } from './order';

// Column limits in database.sql: size INT, price NUMERIC(10,2).
export const MAX_SIZE = 2_147_483_647;
export const MAX_PRICE = 99_999_999.99;

/**
 * Number of whole shares to order: the given `size`, or the maximum whole shares
 * that `amount` pesos can buy at `price` (no fractions). Throws if it is < 1 or
 * above the column limit.
 */
export function resolveSize(quantity: OrderQuantity, price: number): number {
  const size =
    'size' in quantity
      ? quantity.size
      : // Work in cents to avoid floating point surprises (e.g. 9258.5 / 925.85).
        Math.floor(
          Math.floor(quantity.amount * 100 + 1e-6) / Math.round(price * 100),
        );

  if (size < 1) {
    throw new InvalidOrderError(
      'The amount is not enough to buy a single share at this price',
    );
  }
  if (size > MAX_SIZE) {
    throw new InvalidOrderError(`The size cannot exceed ${MAX_SIZE}`);
  }
  return size;
}

/**
 * Whether the user can afford the order, based on its FILLED movements:
 * BUY needs size*price pesos available, SELL needs `size` shares (a zero or
 * negative position can never sell).
 */
export function hasSufficientFunds(
  entries: readonly LedgerEntry[],
  order: { instrumentId: number; side: TradeSide; size: number; price: number },
): boolean {
  if (order.side === 'BUY') {
    return round2(order.size * order.price) <= round2(availableCash(entries));
  }
  return order.size <= netQuantity(entries, order.instrumentId);
}
