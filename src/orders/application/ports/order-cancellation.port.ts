import { PlacedOrder } from '../../domain/order';

export const ORDER_CANCELLATION = Symbol('ORDER_CANCELLATION');

export interface OrderCancellationPort {
  /**
   * Atomically moves the order from NEW to CANCELLED and returns it. Returns null when
   * there is no order with that id in status NEW (unknown id, or any other status).
   */
  cancelIfNew(orderId: number): Promise<PlacedOrder | null>;
  findById(orderId: number): Promise<PlacedOrder | null>;
}
