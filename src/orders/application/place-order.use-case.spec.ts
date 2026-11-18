import {
  InstrumentNotFoundError,
  InvalidOrderError,
  MarketPriceUnavailableError,
  UserNotFoundError,
} from '../domain/errors';
import { buildFakes } from '../testing/in-memory-ports';
import { PlaceOrderUseCase } from './place-order.use-case';

/** Functional tests of order submission (use case + domain rules, in-memory adapters). */
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
const base = { userId: 1, instrumentId: PAMP };

describe('PlaceOrderUseCase', () => {
  describe('MARKET orders', () => {
    it('fills a BUY immediately at the latest close and stores it', async () => {
      const { useCase, saved } = setup();
      const order = await useCase.execute({
        ...base,
        side: 'BUY',
        type: 'MARKET',
        size: 10,
      });

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
      const order = await useCase.execute({
        ...base,
        side: 'SELL',
        type: 'MARKET',
        size: 40,
      });
      expect(order).toMatchObject({ status: 'FILLED', price: 925.85 });
    });

    it('ignores a price sent by the client', async () => {
      const { useCase } = setup();
      const order = await useCase.execute({
        ...base,
        side: 'BUY',
        type: 'MARKET',
        size: 1,
        price: 1,
      });
      expect(order.price).toBe(925.85);
    });

    it('fails with MarketPriceUnavailableError when there is no market data', async () => {
      const { useCase, saved } = setup();
      await expect(
        useCase.execute({
          userId: 1,
          instrumentId: NO_DATA,
          side: 'BUY',
          type: 'MARKET',
          size: 1,
        }),
      ).rejects.toBeInstanceOf(MarketPriceUnavailableError);
      expect(saved).toEqual([]);
    });
  });

  describe('LIMIT orders', () => {
    it('leaves a BUY as NEW at the limit price', async () => {
      const { useCase, saved } = setup();
      const order = await useCase.execute({
        ...base,
        side: 'BUY',
        type: 'LIMIT',
        size: 5,
        price: 900,
      });
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
      const order = await useCase.execute({
        ...base,
        side: 'SELL',
        type: 'LIMIT',
        size: 5,
        price: 1000,
      });
      expect(order.status).toBe('NEW');
    });

    it.each([undefined, 0, -5, 10.123, 'abc'])(
      'requires a valid price (%p)',
      async (price) => {
        const { useCase, saved } = setup();
        await expect(
          useCase.execute({
            ...base,
            side: 'BUY',
            type: 'LIMIT',
            size: 1,
            price,
          }),
        ).rejects.toBeInstanceOf(InvalidOrderError);
        expect(saved).toEqual([]);
      },
    );
  });

  describe('funds validation', () => {
    it('rejects (and stores) a MARKET BUY above the available cash', async () => {
      const { useCase, saved } = setup();
      // 1000 * 925.85 = 925,850 > 753,000
      const order = await useCase.execute({
        ...base,
        side: 'BUY',
        type: 'MARKET',
        size: 1000,
      });
      expect(order).toMatchObject({
        status: 'REJECTED',
        size: 1000,
        price: 925.85,
      });
      expect(saved).toEqual([order]);
    });

    it('rejects a LIMIT BUY above the available cash', async () => {
      const { useCase } = setup();
      const order = await useCase.execute({
        ...base,
        side: 'BUY',
        type: 'LIMIT',
        size: 800,
        price: 1000,
      });
      expect(order.status).toBe('REJECTED');
    });

    it('allows a BUY that costs exactly the available cash, rejects one cent more', async () => {
      const { useCase } = setup();
      const exact = await useCase.execute({
        ...base,
        side: 'BUY',
        type: 'LIMIT',
        size: 753,
        price: 1000,
      });
      expect(exact.status).toBe('NEW'); // 753 * 1000 = 753,000
      const over = await useCase.execute({
        ...base,
        side: 'BUY',
        type: 'LIMIT',
        size: 753,
        price: 1000.01,
      });
      expect(over.status).toBe('REJECTED');
    });

    it('rejects a SELL of more shares than held, for MARKET and LIMIT', async () => {
      const { useCase } = setup();
      const market = await useCase.execute({
        ...base,
        side: 'SELL',
        type: 'MARKET',
        size: 41,
      });
      const limit = await useCase.execute({
        ...base,
        side: 'SELL',
        type: 'LIMIT',
        size: 41,
        price: 1000,
      });
      expect(market.status).toBe('REJECTED');
      expect(limit.status).toBe('REJECTED');
    });

    it('rejects a SELL when the user holds nothing or a negative position', async () => {
      const { useCase } = setup();
      const none = await useCase.execute({
        userId: 1,
        instrumentId: NO_DATA,
        side: 'SELL',
        type: 'LIMIT',
        size: 1,
        price: 100,
      });
      const negative = await useCase.execute({
        userId: 1,
        instrumentId: BMA,
        side: 'SELL',
        type: 'MARKET',
        size: 1,
      });
      expect(none.status).toBe('REJECTED');
      expect(negative.status).toBe('REJECTED');
    });

    it('rejects any BUY for a user without cash', async () => {
      const { useCase } = setup();
      const order = await useCase.execute({
        userId: 2,
        instrumentId: PAMP,
        side: 'BUY',
        type: 'MARKET',
        size: 1,
      });
      expect(order.status).toBe('REJECTED');
    });

    it('takes earlier FILLED orders into account, but NEW orders do not reserve funds', async () => {
      const { useCase } = setup();
      // NEW limit order for 700,000 does not reserve cash
      const pending = await useCase.execute({
        ...base,
        side: 'BUY',
        type: 'LIMIT',
        size: 700,
        price: 1000,
      });
      expect(pending.status).toBe('NEW');
      // 700 * 925.85 = 648,095 <= 753,000 -> filled
      const first = await useCase.execute({
        ...base,
        side: 'BUY',
        type: 'MARKET',
        size: 700,
      });
      expect(first.status).toBe('FILLED');
      // remaining cash 104,905: another 700 shares no longer fit
      const second = await useCase.execute({
        ...base,
        side: 'BUY',
        type: 'MARKET',
        size: 700,
      });
      expect(second.status).toBe('REJECTED');
      // the shares just bought can be sold (40 + 700)
      const sell = await useCase.execute({
        ...base,
        side: 'SELL',
        type: 'MARKET',
        size: 740,
      });
      expect(sell.status).toBe('FILLED');
    });
  });

  describe('amount instead of size', () => {
    it('computes the maximum whole shares for a MARKET order', async () => {
      const { useCase } = setup();
      const order = await useCase.execute({
        ...base,
        side: 'BUY',
        type: 'MARKET',
        amount: 10_000,
      });
      expect(order).toMatchObject({ size: 10, status: 'FILLED' }); // floor(10000 / 925.85)
    });

    it('uses the limit price for a LIMIT order', async () => {
      const { useCase } = setup();
      const order = await useCase.execute({
        ...base,
        side: 'BUY',
        type: 'LIMIT',
        amount: 10_000,
        price: 300,
      });
      expect(order).toMatchObject({ size: 33, price: 300, status: 'NEW' });
    });

    it('buys exactly N shares when the amount is exactly N times the price', async () => {
      const { useCase } = setup();
      const order = await useCase.execute({
        ...base,
        side: 'BUY',
        type: 'MARKET',
        amount: 9258.5,
      });
      expect(order.size).toBe(10);
    });

    it('rejects an amount too small for one share without storing anything', async () => {
      const { useCase, saved } = setup();
      await expect(
        useCase.execute({ ...base, side: 'BUY', type: 'MARKET', amount: 900 }),
      ).rejects.toBeInstanceOf(InvalidOrderError);
      expect(saved).toEqual([]);
    });
  });

  describe('invalid requests (nothing is stored)', () => {
    const valid = { ...base, side: 'BUY', type: 'MARKET', size: 1 };

    it.each([
      ['no body', undefined],
      ['an array', []],
      ['missing userId', { ...valid, userId: undefined }],
      ['non-integer userId', { ...valid, userId: 1.5 }],
      ['missing instrumentId', { ...valid, instrumentId: undefined }],
      ['unknown side', { ...valid, side: 'HOLD' }],
      ['cash side', { ...valid, side: 'CASH_IN' }],
      ['unknown type', { ...valid, type: 'STOP' }],
      ['neither size nor amount', { ...valid, size: undefined }],
      ['both size and amount', { ...valid, amount: 100 }],
      ['zero size', { ...valid, size: 0 }],
      ['fractional size', { ...valid, size: 1.5 }],
      ['string size', { ...valid, size: '3' }],
      ['negative amount', { ...valid, size: undefined, amount: -1 }],
      ['size above the column limit', { ...valid, size: 2_147_483_648 }],
    ])('rejects %s', async (_name, body) => {
      const { useCase, saved } = setup();
      await expect(useCase.execute(body)).rejects.toBeInstanceOf(
        InvalidOrderError,
      );
      expect(saved).toEqual([]);
    });

    it('rejects an unknown user', async () => {
      const { useCase, saved } = setup();
      await expect(
        useCase.execute({ ...valid, userId: 999 }),
      ).rejects.toBeInstanceOf(UserNotFoundError);
      expect(saved).toEqual([]);
    });

    it('rejects an unknown instrument', async () => {
      const { useCase } = setup();
      await expect(
        useCase.execute({ ...valid, instrumentId: 999 }),
      ).rejects.toBeInstanceOf(InstrumentNotFoundError);
    });

    it('rejects trading the cash instrument', async () => {
      const { useCase } = setup();
      await expect(
        useCase.execute({ ...valid, instrumentId: ARS }),
      ).rejects.toBeInstanceOf(InvalidOrderError);
    });
  });
});
