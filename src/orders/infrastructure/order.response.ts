import { OrderSide } from '../../shared/ledger';
import { OrderStatus, OrderType, PlacedOrder } from '../domain/order';

/** HTTP representation of an order (POST /orders, DELETE /orders/:orderId). */
export class OrderResponse {
  id!: number;
  userId!: number;
  instrumentId!: number;
  side!: OrderSide;
  type!: OrderType;
  size!: number;
  /** ARS per share: execution price (MARKET) or limit price (LIMIT). */
  price!: number;
  status!: OrderStatus;
  /** ISO 8601, UTC. */
  datetime!: string;

  static from(order: PlacedOrder): OrderResponse {
    return Object.assign(new OrderResponse(), {
      id: order.id,
      userId: order.userId,
      instrumentId: order.instrumentId,
      side: order.side,
      type: order.type,
      size: order.size,
      price: order.price,
      status: order.status,
      datetime: order.datetime.toISOString(),
    });
  }
}
