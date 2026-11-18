import { Order as OrderRow } from '@prisma/client';
import {
  OrderStatus,
  OrderType,
  PlacedOrder,
  TradeSide,
} from '../domain/order';

/** Prisma `orders` row -> domain order (BUY/SELL orders only, as placed by this API). */
export function toPlacedOrder(row: OrderRow): PlacedOrder {
  return {
    id: row.id,
    userId: row.userId,
    instrumentId: row.instrumentId,
    side: row.side as TradeSide,
    type: row.type as OrderType,
    size: row.size,
    price: row.price.toNumber(),
    status: row.status as OrderStatus,
    datetime: row.datetime,
  };
}
