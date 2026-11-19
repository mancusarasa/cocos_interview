import { FilledOrder } from '../domain/filled-order';

/** FILLED orders used by the portfolio e2e tests: cash 962,900 and 40 PAMP. */
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
