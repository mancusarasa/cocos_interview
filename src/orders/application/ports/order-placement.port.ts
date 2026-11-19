import { LedgerEntry } from '../../../shared/ledger';
import { NewOrder, PlacedOrder } from '../../domain/order';

export const ORDER_PLACEMENT = Symbol('orders/OrderPlacementPort');

/** Operations available while the user's orders are locked. */
export interface OrderLedger {
  /** The user's FILLED orders (cash movements included). */
  findFilledEntries(userId: number): Promise<LedgerEntry[]>;
  save(order: NewOrder): Promise<PlacedOrder>;
}

export interface OrderPlacementPort {
  /**
   * Runs `work` atomically with the user's orders serialized (no two orders of the same
   * user are placed concurrently), so the funds check and the insert cannot interleave
   * with another order. Throws UserNotFoundError if the user does not exist.
   */
  withUserLock<T>(
    userId: number,
    work: (ledger: OrderLedger) => Promise<T>,
  ): Promise<T>;
}
