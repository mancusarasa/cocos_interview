import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { INSTRUMENT_REPOSITORY } from '../src/instruments/application/ports/instrument.repository.port';
import { PrismaService } from '../src/prisma/prisma.service';
import { prismaStub } from './stubs';

const pamp = {
  id: 47,
  ticker: 'PAMP',
  name: 'Pampa Holding S.A.',
  type: 'ACCIONES',
};

describe('GET /instruments (e2e)', () => {
  let app: INestApplication;
  const searchTradable = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .overrideProvider(INSTRUMENT_REPOSITORY)
      .useValue({ searchTradable })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    searchTradable.mockReset();
    searchTradable.mockResolvedValue({ items: [pamp], total: 1 });
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns a page of matching instruments', async () => {
    const res = await request(app.getHttpServer())
      .get('/instruments?search=pamp')
      .expect(200);
    expect(res.body).toEqual({
      items: [pamp],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    expect(searchTradable).toHaveBeenCalledWith({
      term: 'pamp',
      page: 1,
      pageSize: 10,
    });
  });

  it('forwards page and pageSize', async () => {
    searchTradable.mockResolvedValue({ items: [], total: 23 });
    const res = await request(app.getHttpServer())
      .get('/instruments?search=a&page=5&pageSize=20')
      .expect(200);
    expect(res.body).toEqual({
      items: [],
      page: 5,
      pageSize: 20,
      total: 23,
      totalPages: 2,
    });
    expect(searchTradable).toHaveBeenCalledWith({
      term: 'a',
      page: 5,
      pageSize: 20,
    });
  });

  it.each([
    '/instruments',
    '/instruments?search=',
    '/instruments?search=%20%20',
    '/instruments?search=a&page=0',
    '/instruments?search=a&pageSize=51',
    '/instruments?search=a&page=abc',
    '/instruments?search=a&pageSize=1.5',
  ])('returns 400 for %s', async (url) => {
    await request(app.getHttpServer()).get(url).expect(400);
    expect(searchTradable).not.toHaveBeenCalled();
  });
});
