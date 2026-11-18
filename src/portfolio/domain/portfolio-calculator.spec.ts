import { FilledOrder } from './filled-order';
import { calculatePortfolio } from './portfolio-calculator';

const ars = {
  instrumentId: 66,
  ticker: 'ARS',
  name: 'PESOS',
  instrumentType: 'MONEDA',
};
const pamp = {
  instrumentId: 47,
  ticker: 'PAMP',
  name: 'Pampa Holding S.A.',
  instrumentType: 'ACCIONES',
};
const bma = {
  instrumentId: 31,
  ticker: 'BMA',
  name: 'Banco Macro S.A.',
  instrumentType: 'ACCIONES',
};
const metr = {
  instrumentId: 54,
  ticker: 'METR',
  name: 'MetroGAS S.A.',
  instrumentType: 'ACCIONES',
};

// FILLED orders of user 1 in database.sql
const user1Orders: FilledOrder[] = [
  { ...ars, side: 'CASH_IN', size: 1_000_000, price: 1 },
  { ...pamp, side: 'BUY', size: 50, price: 930 },
  { ...pamp, side: 'SELL', size: 10, price: 940 },
  { ...ars, side: 'CASH_OUT', size: 100_000, price: 1 },
  { ...bma, side: 'BUY', size: 20, price: 1540 },
  { ...metr, side: 'BUY', size: 500, price: 250 },
  { ...bma, side: 'SELL', size: 30, price: 1530 },
];
const closes = new Map([
  [47, 925.85],
  [31, 1502.8],
  [54, 229.5],
]);

describe('calculatePortfolio', () => {
  it('computes the seeded user 1 portfolio, keeping the negative position', () => {
    const { portfolio, unpricedInstrumentIds } = calculatePortfolio(
      user1Orders,
      closes,
    );

    expect(unpricedInstrumentIds).toEqual([]);
    expect(portfolio.availableCash).toBe(753_000);
    expect(portfolio.totalValue).toBe(889_756);
    expect(portfolio.positions).toEqual([
      {
        instrumentId: 31,
        ticker: 'BMA',
        name: 'Banco Macro S.A.',
        quantity: -10,
        marketValue: -15_028,
        totalReturnPct: null,
      },
      {
        instrumentId: 47,
        ticker: 'PAMP',
        name: 'Pampa Holding S.A.',
        quantity: 40,
        marketValue: 37_034,
        totalReturnPct: -0.45,
      },
      {
        instrumentId: 54,
        ticker: 'METR',
        name: 'MetroGAS S.A.',
        quantity: 500,
        marketValue: 114_750,
        totalReturnPct: -8.2,
      },
    ]);
  });

  it('returns zeros for a user without orders', () => {
    expect(calculatePortfolio([], new Map()).portfolio).toEqual({
      totalValue: 0,
      availableCash: 0,
      positions: [],
    });
  });

  it('omits positions whose net quantity is zero but keeps their cash effect', () => {
    const orders: FilledOrder[] = [
      { ...ars, side: 'CASH_IN', size: 10_000, price: 1 },
      { ...pamp, side: 'BUY', size: 10, price: 100 },
      { ...pamp, side: 'SELL', size: 10, price: 120 },
    ];
    const { portfolio } = calculatePortfolio(orders, new Map([[47, 130]]));
    expect(portfolio.positions).toEqual([]);
    expect(portfolio.availableCash).toBe(10_200);
    expect(portfolio.totalValue).toBe(10_200);
  });

  it('does not list the cash instrument as a position', () => {
    const orders: FilledOrder[] = [
      { ...ars, side: 'CASH_IN', size: 500, price: 1 },
    ];
    const { portfolio } = calculatePortfolio(orders, new Map());
    expect(portfolio.positions).toEqual([]);
    expect(portfolio.availableCash).toBe(500);
  });

  it('uses the weighted average buy cost for the total return', () => {
    const orders: FilledOrder[] = [
      { ...pamp, side: 'BUY', size: 10, price: 100 },
      { ...pamp, side: 'BUY', size: 30, price: 200 },
    ];
    // avg cost = (1000 + 6000) / 40 = 175 -> (210 - 175) / 175 = +20%
    const { portfolio } = calculatePortfolio(orders, new Map([[47, 210]]));
    expect(portfolio.positions[0].totalReturnPct).toBe(20);
    expect(portfolio.positions[0].marketValue).toBe(8_400);
  });

  it('excludes instruments without market data and reports them', () => {
    const orders: FilledOrder[] = [
      { ...ars, side: 'CASH_IN', size: 1_000, price: 1 },
      { ...pamp, side: 'BUY', size: 1, price: 100 },
    ];
    const { portfolio, unpricedInstrumentIds } = calculatePortfolio(
      orders,
      new Map(),
    );
    expect(unpricedInstrumentIds).toEqual([47]);
    expect(portfolio.positions).toEqual([]);
    expect(portfolio.availableCash).toBe(900);
  });
});
