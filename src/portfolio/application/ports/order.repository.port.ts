import { FilledOrder } from '../../domain/filled-order';

export const ORDER_REPOSITORY = Symbol('portfolio/OrderRepositoryPort');

export interface OrderRepositoryPort {
  /** All FILLED orders of the user (cash movements included), with instrument data. */
  findFilledByUserId(userId: number): Promise<FilledOrder[]>;
}
