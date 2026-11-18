import { OrderNotCancellableError, OrderNotFoundError } from '../domain/errors';
import { OrderStatus, PlaceOrderCommand } from '../domain/order';
import { buildFakes } from '../testing/in-memory-ports';
import { CancelOrderUseCase } from './cancel-order.use-case';
import { PlaceOrderUseCase } from './place-order.use-case';

/** Functional tests of order cancellation, together with placement on the same store. */
function setup() {
  const fakes = buildFakes();
  const placeOrder = new PlaceOrderUseCase(
    fakes.placement,
    fakes.instruments,
    fakes.marketPrices,
  );
  const cancelOrder = new CancelOrderUseCase(fakes.placement);
  return { placeOrder, cancelOrder, store: fakes.placement };
}

const PAMP = 47; // close 925.85; user 1 has 753,000 in cash

const limitBuy = (size: number, price: number): PlaceOrderCommand => ({
  userId: 1,
  instrumentId: PAMP,
  side: 'BUY',
  type: 'LIMIT',
  price,
  quantity: { size },
});

const fixture = (status: OrderStatus) => ({
  userId: 1,
  instrumentId: PAMP,
  side: 'BUY' as const,
  type: 'LIMIT' as const,
  size: 1,
  price: 900,
  status,
  datetime: new Date('2023-07-13T12:00:00Z'),
});

describe('CancelOrderUseCase', () => {
  it('cancels a NEW order, keeping the rest of it unchanged', async () => {
    const { placeOrder, cancelOrder, store } = setup();
    const placed = await placeOrder.execute(limitBuy(5, 900));
    expect(placed.status).toBe('NEW');

    const cancelled = await cancelOrder.execute(placed.id);

    expect(cancelled).toEqual({ ...placed, status: 'CANCELLED' });
    expect(await store.findById(placed.id)).toEqual(cancelled);
  });

  it.each<OrderStatus>(['FILLED', 'REJECTED', 'CANCELLED'])(
    'refuses to cancel a %s order and leaves it unchanged',
    async (status) => {
      const { cancelOrder, store } = setup();
      const order = store.seed(fixture(status));

      const error = await cancelOrder
        .execute(order.id)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(OrderNotCancellableError);
      expect((error as OrderNotCancellableError).status).toBe(status);
      expect((error as Error).message).toBe(
        `Order ${order.id} is ${status}; only NEW orders can be cancelled`,
      );
      expect(await store.findById(order.id)).toEqual(order);
    },
  );

  it('refuses to cancel the same order twice', async () => {
    const { placeOrder, cancelOrder } = setup();
    const placed = await placeOrder.execute(limitBuy(5, 900));

    await cancelOrder.execute(placed.id);
    await expect(cancelOrder.execute(placed.id)).rejects.toBeInstanceOf(
      OrderNotCancellableError,
    );
  });

  it('refuses to cancel an order filled at placement', async () => {
    const { placeOrder, cancelOrder } = setup();
    const filled = await placeOrder.execute({
      userId: 1,
      instrumentId: PAMP,
      side: 'BUY',
      type: 'MARKET',
      quantity: { size: 1 },
    });
    expect(filled.status).toBe('FILLED');
    await expect(cancelOrder.execute(filled.id)).rejects.toBeInstanceOf(
      OrderNotCancellableError,
    );
  });

  it('fails with OrderNotFoundError for an unknown order', async () => {
    const { cancelOrder } = setup();
    await expect(cancelOrder.execute(999)).rejects.toBeInstanceOf(
      OrderNotFoundError,
    );
  });

  it('does not change the cash available to later orders', async () => {
    const { placeOrder, cancelOrder } = setup();
    // 753 * 1000 = 753,000 = all the cash; NEW orders do not reserve funds anyway
    const pending = await placeOrder.execute(limitBuy(753, 1000));
    await cancelOrder.execute(pending.id);

    const again = await placeOrder.execute(limitBuy(753, 1000));
    expect(again.status).toBe('NEW');
    const over = await placeOrder.execute(limitBuy(753, 1000.01));
    expect(over.status).toBe('REJECTED');
  });
});
