import { Order as OrderRow } from '@prisma/client';
import { OrderSide } from '../../shared/ledger';
import { OrderStatus, OrderType, PlacedOrder } from '../domain/order';

/** Prisma `orders` row -> domain order (any side, including cash movements). */
export function toPlacedOrder(row: OrderRow): PlacedOrder {
  return {
    id: row.id,
    userId: row.userId,
    instrumentId: row.instrumentId,
    side: row.side as OrderSide,
    type: row.type as OrderType,
    size: row.size,
    price: row.price.toNumber(),
    status: row.status as OrderStatus,
    datetime: row.datetime,
  };
}
