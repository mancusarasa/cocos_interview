import { BadRequestException } from '@nestjs/common';
import { bodyValidationPipe } from '../../common/validation/validation-pipes';
import { PlaceOrderDto, toPlaceOrderCommand } from './place-order.dto';

/** Runs the pipe exactly like Nest does for `@Body(bodyValidationPipe)`. */
const parse = (body: unknown) =>
  bodyValidationPipe.transform(body, {
    type: 'body',
    metatype: PlaceOrderDto,
  }) as Promise<PlaceOrderDto>;

const market = {
  userId: 1,
  instrumentId: 47,
  side: 'BUY',
  type: 'MARKET',
  size: 10,
};
const limit = { ...market, type: 'LIMIT', price: 900 };

describe('PlaceOrderDto', () => {
  describe('valid bodies', () => {
    it('maps a MARKET order with a size', async () => {
      expect(toPlaceOrderCommand(await parse(market))).toEqual({
        userId: 1,
        instrumentId: 47,
        side: 'BUY',
        type: 'MARKET',
        quantity: { size: 10 },
      });
    });

    it('maps a LIMIT order with an amount', async () => {
      const dto = await parse({ ...limit, size: undefined, amount: 10_000 });
      expect(toPlaceOrderCommand(dto)).toEqual({
        userId: 1,
        instrumentId: 47,
        side: 'BUY',
        type: 'LIMIT',
        price: 900,
        quantity: { amount: 10_000 },
      });
    });

    it('ignores a price sent with a MARKET order', async () => {
      const command = toPlaceOrderCommand(await parse({ ...market, price: 1 }));
      expect(command).not.toHaveProperty('price');
    });

    it('treats a null size as absent when an amount is sent', async () => {
      const command = toPlaceOrderCommand(
        await parse({ ...market, size: null, amount: 500 }),
      );
      expect(command.quantity).toEqual({ amount: 500 });
    });

    it('accepts prices with 2 decimals', async () => {
      await expect(parse({ ...limit, price: 1000.01 })).resolves.toBeDefined();
    });
  });

  describe('invalid bodies', () => {
    it.each([
      ['no body', undefined],
      ['an array', []],
      ['missing userId', { ...market, userId: undefined }],
      ['non-integer userId', { ...market, userId: 1.5 }],
      ['string userId', { ...market, userId: '1' }],
      ['missing instrumentId', { ...market, instrumentId: undefined }],
      ['unknown side', { ...market, side: 'HOLD' }],
      ['cash side', { ...market, side: 'CASH_IN' }],
      ['unknown type', { ...market, type: 'STOP' }],
      ['neither size nor amount', { ...market, size: undefined }],
      ['both size and amount', { ...market, amount: 100 }],
      ['zero size', { ...market, size: 0 }],
      ['fractional size', { ...market, size: 1.5 }],
      ['string size', { ...market, size: '3' }],
      ['size above the column limit', { ...market, size: 2_147_483_648 }],
      ['negative amount', { ...market, size: undefined, amount: -1 }],
      ['string amount', { ...market, size: undefined, amount: '100' }],
      ['LIMIT without price', { ...limit, price: undefined }],
      ['LIMIT with zero price', { ...limit, price: 0 }],
      ['LIMIT with negative price', { ...limit, price: -5 }],
      ['LIMIT with 3 decimals', { ...limit, price: 10.123 }],
      ['LIMIT with string price', { ...limit, price: 'abc' }],
      ['an unknown field', { ...market, foo: 'bar' }],
    ])('rejects %s', async (_name, body) => {
      await expect(parse(body)).rejects.toBeInstanceOf(BadRequestException);
    });

    const messagesOf = async (body: unknown) => {
      const error = (await parse(body).catch(
        (e: unknown) => e,
      )) as BadRequestException;
      return (error.getResponse() as { message: string[] }).message;
    };

    it.each([
      ['both size and amount', { ...market, amount: 100 }],
      ['neither size nor amount', { ...market, size: undefined }],
    ])(
      'reports the size/amount rule once when %s are sent',
      async (_name, body) => {
        expect(await messagesOf(body)).toEqual([
          'exactly one of size, amount must be provided',
        ]);
      },
    );

    it('reports the type error first, one message per field', async () => {
      expect(await messagesOf({ ...market, size: 'abc', userId: '1' })).toEqual(
        ['userId must be an integer number', 'size must be an integer number'],
      );
    });
  });
});
