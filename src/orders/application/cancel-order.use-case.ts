import { Inject, Injectable } from '@nestjs/common';
import { OrderNotCancellableError, OrderNotFoundError } from '../domain/errors';
import { PlacedOrder } from '../domain/order';
import {
  ORDER_CANCELLATION,
  OrderCancellationPort,
} from './ports/order-cancellation.port';

@Injectable()
export class CancelOrderUseCase {
  constructor(
    @Inject(ORDER_CANCELLATION)
    private readonly orders: OrderCancellationPort,
  ) {}

  /**
   * Cancels a NEW order (NEW -> CANCELLED). The order is kept, with its original
   * datetime. NEW orders do not reserve cash or shares, so balances are unaffected.
   */
  async execute(orderId: number): Promise<PlacedOrder> {
    const cancelled = await this.orders.cancelIfNew(orderId);
    if (cancelled) return cancelled;

    // Nothing was cancelled: tell "does not exist" from "not cancellable".
    const order = await this.orders.findById(orderId);
    if (!order) throw new OrderNotFoundError(orderId);
    throw new OrderNotCancellableError(orderId, order.status);
  }
}
