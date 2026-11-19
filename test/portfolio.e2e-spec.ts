import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { MARKET_DATA_REPOSITORY } from '../src/portfolio/application/ports/market-data.repository.port';
import { ORDER_REPOSITORY } from '../src/portfolio/application/ports/order.repository.port';
import { USER_REPOSITORY } from '../src/portfolio/application/ports/user.repository.port';
import { PrismaService } from '../src/prisma/prisma.service';
import { fakeOrders, prismaStub } from './stubs';

describe('GET /users/:userId/portfolio (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .overrideProvider(USER_REPOSITORY)
      .useValue({ exists: async (id: number) => id === 1 })
      .overrideProvider(ORDER_REPOSITORY)
      .useValue({ findFilledByUserId: async () => fakeOrders })
      .overrideProvider(MARKET_DATA_REPOSITORY)
      .useValue({ findLatestCloses: async () => new Map([[47, 925.85]]) })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns the portfolio of an existing user', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/1/portfolio')
      .expect(200);
    expect(res.body).toEqual({
      userId: 1,
      availableCash: 962_900, // 1,000,000 - 50*930 + 10*940
      totalValue: 999_934, // + 40 * 925.85
      positions: [
        {
          instrumentId: 47,
          ticker: 'PAMP',
          name: 'Pampa Holding S.A.',
          quantity: 40,
          marketValue: 37_034,
          totalReturnPct: -0.45,
        },
      ],
    });
  });

  it('returns 404 for an unknown user', () =>
    request(app.getHttpServer()).get('/users/999/portfolio').expect(404));

  it('returns 400 for a non-numeric user id', () =>
    request(app.getHttpServer()).get('/users/abc/portfolio').expect(400));

  it.each(['0', '3000000000'])(
    'returns 400 for a user id out of the INT4 range (%s)',
    (id) =>
      request(app.getHttpServer()).get(`/users/${id}/portfolio`).expect(400),
  );
});
