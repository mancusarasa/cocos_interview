import { UserNotFoundError } from '../../shared/errors';
import {
  InstrumentNotFoundError,
  InvalidOrderError,
  MarketPriceUnavailableError,
} from '../domain/errors';
import { OrderQuantity, PlaceOrderCommand, TradeSide } from '../domain/order';
import { buildFakes } from '../testing/in-memory-ports';
import { PlaceOrderUseCase } from './place-order.use-case';

/**
 * Functional tests of order submission (use case + domain rules, in-memory adapters).
 * Request shape validation is covered by `place-order.dto.spec.ts`.
 */
function setup() {
  const fakes = buildFakes();
  const useCase = new PlaceOrderUseCase(
    fakes.placement,
    fakes.instruments,
    fakes.marketPrices,
  );
  return { useCase, saved: fakes.placement.saved };
}

const PAMP = 47; // close 925.85, user 1 holds 40
const BMA = 31; // close 1502.80, user 1 holds -10 (seed quirk)
const NO_DATA = 7; // no market data, user holds nothing
const ARS = 66;

type Target = { userId?: number; instrumentId?: number };

const market = (
  side: TradeSide,
  quantity: OrderQuantity,
  target: Target = {},
): PlaceOrderCommand => ({
  userId: 1,
  instrumentId: PAMP,
  ...target,
  side,
  type: 'MARKET',
  quantity,
});

const limit = (
  side: TradeSide,
  quantity: OrderQuantity,
  price: number,
  target: Target = {},
): PlaceOrderCommand => ({
  userId: 1,
  instrumentId: PAMP,
  ...target,
  side,
  type: 'LIMIT',
  price,
  quantity,
});

describe('PlaceOrderUseCase', () => {
  describe('MARKET orders', () => {
    it('fills a BUY immediately at the latest close and stores it', async () => {
      const { useCase, saved } = setup();
      const order = await useCase.execute(market('BUY', { size: 10 }));

      expect(order).toMatchObject({
        userId: 1,
        instrumentId: PAMP,
        side: 'BUY',
        type: 'MARKET',
        size: 10,
        price: 925.85,
        status: 'FILLED',
      });
      expect(order.id).toBeDefined();
      expect(order.datetime).toBeInstanceOf(Date);
      expect(saved).toEqual([order]);
    });

    it('fills a SELL of shares the user holds', async () => {
      const { useCase } = setup();
      const order = await useCase.execute(market('SELL', { size: 40 }));
      expect(order).toMatchObject({ status: 'FILLED', price: 925.85 });
    });

    it('fails with MarketPriceUnavailableError when there is no market data', async () => {
      const { useCase, saved } = setup();
      await expect(
        useCase.execute(market('BUY', { size: 1 }, { instrumentId: NO_DATA })),
      ).rejects.toBeInstanceOf(MarketPriceUnavailableError);
      expect(saved).toEqual([]);
    });
  });

  describe('LIMIT orders', () => {
    it('leaves a BUY as NEW at the limit price', async () => {
      const { useCase, saved } = setup();
      const order = await useCase.execute(limit('BUY', { size: 5 }, 900));
      expect(order).toMatchObject({
        type: 'LIMIT',
        size: 5,
        price: 900,
        status: 'NEW',
      });
      expect(saved).toHaveLength(1);
    });

    it('leaves a SELL as NEW', async () => {
      const { useCase } = setup();
      const order = await useCase.execute(limit('SELL', { size: 5 }, 1000));
      expect(order.status).toBe('NEW');
    });

    it('does not need market data', async () => {
      const { useCase } = setup();
      const order = await useCase.execute(
        limit('BUY', { size: 1 }, 100, { instrumentId: NO_DATA }),
      );
      expect(order.status).toBe('NEW');
    });
  });

  describe('funds validation', () => {
    it('rejects (and stores) a MARKET BUY above the available cash', async () => {
      const { useCase, saved } = setup();
      // 1000 * 925.85 = 925,850 > 753,000
      const order = await useCase.execute(market('BUY', { size: 1000 }));
      expect(order).toMatchObject({
        status: 'REJECTED',
        size: 1000,
        price: 925.85,
      });
      expect(saved).toEqual([order]);
    });

    it('rejects a LIMIT BUY above the available cash', async () => {
      const { useCase } = setup();
      const order = await useCase.execute(limit('BUY', { size: 800 }, 1000));
      expect(order.status).toBe('REJECTED');
    });

    it('allows a BUY that costs exactly the available cash, rejects one cent more', async () => {
      const { useCase } = setup();
      // 753 * 1000 = 753,000
      const exact = await useCase.execute(limit('BUY', { size: 753 }, 1000));
      expect(exact.status).toBe('NEW');
      const over = await useCase.execute(limit('BUY', { size: 753 }, 1000.01));
      expect(over.status).toBe('REJECTED');
    });

    it('rejects a SELL of more shares than held, for MARKET and LIMIT', async () => {
      const { useCase } = setup();
      const m = await useCase.execute(market('SELL', { size: 41 }));
      const l = await useCase.execute(limit('SELL', { size: 41 }, 1000));
      expect(m.status).toBe('REJECTED');
      expect(l.status).toBe('REJECTED');
    });

    it('rejects a SELL when the user holds nothing or a negative position', async () => {
      const { useCase } = setup();
      const none = await useCase.execute(
        limit('SELL', { size: 1 }, 100, { instrumentId: NO_DATA }),
      );
      const negative = await useCase.execute(
        market('SELL', { size: 1 }, { instrumentId: BMA }),
      );
      expect(none.status).toBe('REJECTED');
      expect(negative.status).toBe('REJECTED');
    });

    it('rejects any BUY for a user without cash', async () => {
      const { useCase } = setup();
      const order = await useCase.execute(
        market('BUY', { size: 1 }, { userId: 2 }),
      );
      expect(order.status).toBe('REJECTED');
    });

    it('takes earlier FILLED orders into account, but NEW orders do not reserve funds', async () => {
      const { useCase } = setup();
      // NEW limit order for 700,000 does not reserve cash
      const pending = await useCase.execute(limit('BUY', { size: 700 }, 1000));
      expect(pending.status).toBe('NEW');
      // 700 * 925.85 = 648,095 <= 753,000 -> filled
      const first = await useCase.execute(market('BUY', { size: 700 }));
      expect(first.status).toBe('FILLED');
      // remaining cash 104,905: another 700 shares no longer fit
      const second = await useCase.execute(market('BUY', { size: 700 }));
      expect(second.status).toBe('REJECTED');
      // the shares just bought can be sold (40 + 700)
      const sell = await useCase.execute(market('SELL', { size: 740 }));
      expect(sell.status).toBe('FILLED');
    });
  });

  describe('amount instead of size', () => {
    it('computes the maximum whole shares for a MARKET order', async () => {
      const { useCase } = setup();
      // floor(10000 / 925.85) = 10
      const order = await useCase.execute(market('BUY', { amount: 10_000 }));
      expect(order).toMatchObject({ size: 10, status: 'FILLED' });
    });

    it('uses the limit price for a LIMIT order', async () => {
      const { useCase } = setup();
      const order = await useCase.execute(
        limit('BUY', { amount: 10_000 }, 300),
      );
      expect(order).toMatchObject({ size: 33, price: 300, status: 'NEW' });
    });

    it('buys exactly N shares when the amount is exactly N times the price', async () => {
      const { useCase } = setup();
      const order = await useCase.execute(market('BUY', { amount: 9258.5 }));
      expect(order.size).toBe(10);
    });

    it('rejects an amount too small for one share without storing anything', async () => {
      const { useCase, saved } = setup();
      await expect(
        useCase.execute(market('BUY', { amount: 900 })),
      ).rejects.toBeInstanceOf(InvalidOrderError);
      expect(saved).toEqual([]);
    });

    it('rejects an amount that buys more shares than the column allows', async () => {
      const { useCase, saved } = setup();
      // 100,000,000 / 0.01 = 10^10 shares > INT max
      await expect(
        useCase.execute(limit('BUY', { amount: 100_000_000 }, 0.01)),
      ).rejects.toBeInstanceOf(InvalidOrderError);
      expect(saved).toEqual([]);
    });
  });

  describe('requests that break a business rule (nothing is stored)', () => {
    it('rejects an unknown user', async () => {
      const { useCase, saved } = setup();
      await expect(
        useCase.execute(market('BUY', { size: 1 }, { userId: 999 })),
      ).rejects.toBeInstanceOf(UserNotFoundError);
      expect(saved).toEqual([]);
    });

    it('rejects an unknown instrument', async () => {
      const { useCase } = setup();
      await expect(
        useCase.execute(market('BUY', { size: 1 }, { instrumentId: 999 })),
      ).rejects.toBeInstanceOf(InstrumentNotFoundError);
    });

    it('rejects trading the cash instrument', async () => {
      const { useCase } = setup();
      await expect(
        useCase.execute(market('BUY', { size: 1 }, { instrumentId: ARS })),
      ).rejects.toBeInstanceOf(InvalidOrderError);
    });
  });
});
