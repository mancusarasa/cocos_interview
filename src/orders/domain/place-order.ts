import {
  availableCash,
  LedgerEntry,
  netQuantity,
  round2,
} from '../../shared/ledger';
import { InvalidOrderError } from './errors';
import { OrderRequest, OrderType, TradeSide } from './order';

// Column limits in database.sql: size INT, price NUMERIC(10,2).
const MAX_SIZE = 2_147_483_647;
const MAX_PRICE = 99_999_999.99;

const SIDES: readonly TradeSide[] = ['BUY', 'SELL'];
const TYPES: readonly OrderType[] = ['MARKET', 'LIMIT'];

const isPositiveInt = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v > 0;

const isPresent = (v: unknown): boolean => v !== undefined && v !== null;

function hasAtMostTwoDecimals(n: number): boolean {
  return Math.abs(Math.round(n * 100) - n * 100) < 1e-6;
}

/** Validates the raw body of the request. Throws InvalidOrderError. */
export function parseOrderRequest(input: unknown): OrderRequest {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new InvalidOrderError('The request body must be a JSON object');
  }
  const body = input as Record<string, unknown>;

  if (!isPositiveInt(body.userId)) {
    throw new InvalidOrderError('`userId` must be a positive integer');
  }
  if (!isPositiveInt(body.instrumentId)) {
    throw new InvalidOrderError('`instrumentId` must be a positive integer');
  }
  if (!SIDES.includes(body.side as TradeSide)) {
    throw new InvalidOrderError('`side` must be BUY or SELL');
  }
  if (!TYPES.includes(body.type as OrderType)) {
    throw new InvalidOrderError('`type` must be MARKET or LIMIT');
  }
  const side = body.side as TradeSide;
  const type = body.type as OrderType;

  const hasSize = isPresent(body.size);
  const hasAmount = isPresent(body.amount);
  if (hasSize === hasAmount) {
    throw new InvalidOrderError('Send exactly one of `size` or `amount`');
  }
  if (hasSize && !isPositiveInt(body.size)) {
    throw new InvalidOrderError('`size` must be a positive integer');
  }
  if (
    hasAmount &&
    !(
      typeof body.amount === 'number' &&
      Number.isFinite(body.amount) &&
      body.amount > 0
    )
  ) {
    throw new InvalidOrderError('`amount` must be a positive number');
  }

  let price: number | undefined;
  if (type === 'LIMIT') {
    if (
      typeof body.price !== 'number' ||
      !Number.isFinite(body.price) ||
      body.price <= 0 ||
      body.price > MAX_PRICE ||
      !hasAtMostTwoDecimals(body.price)
    ) {
      throw new InvalidOrderError(
        '`price` is required for LIMIT orders: a positive number with at most 2 decimals',
      );
    }
    price = body.price;
  }
  // MARKET orders ignore any price sent by the client.

  return {
    userId: body.userId,
    instrumentId: body.instrumentId,
    side,
    type,
    size: hasSize ? (body.size as number) : undefined,
    amount: hasAmount ? (body.amount as number) : undefined,
    price,
  };
}

/**
 * Number of whole shares to order: the given `size`, or the maximum whole shares
 * that `amount` pesos can buy at `price` (no fractions). Throws if it is < 1.
 */
export function resolveSize(
  request: Pick<OrderRequest, 'size' | 'amount'>,
  price: number,
): number {
  const size =
    request.size ??
    // Work in cents to avoid floating point surprises (e.g. 9258.5 / 925.85).
    Math.floor(
      Math.floor((request.amount as number) * 100 + 1e-6) /
        Math.round(price * 100),
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
