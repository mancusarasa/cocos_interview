import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { INSTRUMENT_REPOSITORY } from '../src/orders/application/ports/instrument.repository.port';
import { MARKET_PRICE_REPOSITORY } from '../src/orders/application/ports/market-price.repository.port';
import { ORDER_CANCELLATION } from '../src/orders/application/ports/order-cancellation.port';
import { ORDER_PLACEMENT } from '../src/orders/application/ports/order-placement.port';
import { buildFakes } from '../src/orders/testing/in-memory-ports';
import { PrismaService } from '../src/prisma/prisma.service';
import { prismaStub } from './stubs';

describe('POST /orders (e2e)', () => {
  let app: INestApplication;
  let fakes: ReturnType<typeof buildFakes>;

  beforeEach(async () => {
    fakes = buildFakes();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .overrideProvider(ORDER_PLACEMENT)
      .useValue(fakes.placement)
      .overrideProvider(ORDER_CANCELLATION)
      .useValue(fakes.placement)
      .overrideProvider(INSTRUMENT_REPOSITORY)
      .useValue(fakes.instruments)
      .overrideProvider(MARKET_PRICE_REPOSITORY)
      .useValue(fakes.marketPrices)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const post = (body: unknown) =>
    request(app.getHttpServer())
      .post('/orders')
      .send(body as object);

  it('201: a MARKET BUY is FILLED at the latest close', async () => {
    const res = await post({
      userId: 1,
      instrumentId: 47,
      side: 'BUY',
      type: 'MARKET',
      size: 10,
    }).expect(201);
    expect(res.body).toMatchObject({
      userId: 1,
      instrumentId: 47,
      side: 'BUY',
      type: 'MARKET',
      size: 10,
      price: 925.85,
      status: 'FILLED',
    });
    expect(typeof res.body.id).toBe('number');
    expect(typeof res.body.datetime).toBe('string');
  });

  it('201: a LIMIT order with an amount is NEW', async () => {
    const res = await post({
      userId: 1,
      instrumentId: 47,
      side: 'BUY',
      type: 'LIMIT',
      amount: 10000,
      price: 300,
    }).expect(201);
    expect(res.body).toMatchObject({ size: 33, price: 300, status: 'NEW' });
  });

  it('201: an order above the available cash is stored as REJECTED', async () => {
    const res = await post({
      userId: 1,
      instrumentId: 47,
      side: 'BUY',
      type: 'MARKET',
      size: 1000,
    }).expect(201);
    expect(res.body.status).toBe('REJECTED');
    expect(fakes.placement.saved).toHaveLength(1);
  });

  it.each([
    ['empty body', {}],
    [
      'string size',
      { userId: 1, instrumentId: 47, side: 'BUY', type: 'MARKET', size: '3' },
    ],
    [
      'unknown field',
      {
        userId: 1,
        instrumentId: 47,
        side: 'BUY',
        type: 'MARKET',
        size: 1,
        foo: 1,
      },
    ],
    [
      'both size and amount',
      {
        userId: 1,
        instrumentId: 47,
        side: 'BUY',
        type: 'MARKET',
        size: 1,
        amount: 10,
      },
    ],
    [
      'LIMIT without price',
      { userId: 1, instrumentId: 47, side: 'BUY', type: 'LIMIT', size: 1 },
    ],
    [
      'cash instrument',
      { userId: 1, instrumentId: 66, side: 'BUY', type: 'MARKET', size: 1 },
    ],
    [
      'amount too small',
      { userId: 1, instrumentId: 47, side: 'BUY', type: 'MARKET', amount: 1 },
    ],
  ])('400: %s', async (_name, body) => {
    await post(body).expect(400);
    expect(fakes.placement.saved).toEqual([]);
  });

  it('404: unknown user', () =>
    post({
      userId: 999,
      instrumentId: 47,
      side: 'BUY',
      type: 'MARKET',
      size: 1,
    }).expect(404));

  it('404: unknown instrument', () =>
    post({
      userId: 1,
      instrumentId: 999,
      side: 'BUY',
      type: 'MARKET',
      size: 1,
    }).expect(404));

  it('422: MARKET order for an instrument without market data', () =>
    post({
      userId: 1,
      instrumentId: 7,
      side: 'BUY',
      type: 'MARKET',
      size: 1,
    }).expect(422));

  it('400: malformed JSON', () =>
    request(app.getHttpServer())
      .post('/orders')
      .set('Content-Type', 'application/json')
      .send('{not json')
      .expect(400));

  describe('DELETE /orders/:orderId', () => {
    const del = (id: string | number) =>
      request(app.getHttpServer()).delete(`/orders/${id}`);

    const placeLimit = async () => {
      const res = await post({
        userId: 1,
        instrumentId: 47,
        side: 'BUY',
        type: 'LIMIT',
        size: 5,
        price: 900,
      }).expect(201);
      return res.body as { id: number; status: string };
    };

    it('200: cancels a NEW order and returns it', async () => {
      const placed = await placeLimit();
      const res = await del(placed.id).expect(200);
      expect(res.body).toMatchObject({
        id: placed.id,
        status: 'CANCELLED',
        type: 'LIMIT',
        size: 5,
        price: 900,
      });
    });

    it('409: cancelling the same order twice', async () => {
      const placed = await placeLimit();
      await del(placed.id).expect(200);
      const res = await del(placed.id).expect(409);
      expect(res.body.message).toBe(
        `Order ${placed.id} is CANCELLED; only NEW orders can be cancelled`,
      );
    });

    it('409: cancelling a FILLED order', async () => {
      const res = await post({
        userId: 1,
        instrumentId: 47,
        side: 'BUY',
        type: 'MARKET',
        size: 1,
      }).expect(201);
      await del(res.body.id).expect(409);
    });

    it('404: unknown order', () => del(999).expect(404));

    it('400: non-numeric id', () => del('abc').expect(400));
  });
});
