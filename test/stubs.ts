import { FilledOrder } from '../src/portfolio/domain/filled-order';

/** Replaces PrismaService so e2e tests do not need a database. */
export const prismaStub = {
  $connect: async () => undefined,
  $disconnect: async () => undefined,
};

export const fakeOrders: FilledOrder[] = [
  {
    instrumentId: 66,
    ticker: 'ARS',
    name: 'PESOS',
    instrumentType: 'MONEDA',
    side: 'CASH_IN',
    size: 1_000_000,
    price: 1,
  },
  {
    instrumentId: 47,
    ticker: 'PAMP',
    name: 'Pampa Holding S.A.',
    instrumentType: 'ACCIONES',
    side: 'BUY',
    size: 50,
    price: 930,
  },
  {
    instrumentId: 47,
    ticker: 'PAMP',
    name: 'Pampa Holding S.A.',
    instrumentType: 'ACCIONES',
    side: 'SELL',
    size: 10,
    price: 940,
  },
];
