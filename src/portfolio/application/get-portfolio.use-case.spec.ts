import { UserNotFoundError } from '../../shared/errors';
import { FilledOrder } from '../domain/filled-order';
import { GetPortfolioUseCase } from './get-portfolio.use-case';

const orders: FilledOrder[] = [
  {
    instrumentId: 66,
    ticker: 'ARS',
    name: 'PESOS',
    instrumentType: 'MONEDA',
    side: 'CASH_IN',
    size: 1000,
    price: 1,
  },
  {
    instrumentId: 47,
    ticker: 'PAMP',
    name: 'Pampa',
    instrumentType: 'ACCIONES',
    side: 'BUY',
    size: 2,
    price: 100,
  },
];

function build(opts: { userExists?: boolean } = {}) {
  const requestedIds: number[][] = [];
  const useCase = new GetPortfolioUseCase(
    { exists: async () => opts.userExists ?? true },
    { findFilledByUserId: async () => orders },
    {
      findLatestCloses: async (ids) => {
        requestedIds.push(ids);
        return new Map([[47, 150]]);
      },
    },
  );
  return { useCase, requestedIds };
}

describe('GetPortfolioUseCase', () => {
  it('throws UserNotFoundError for an unknown user', async () => {
    const { useCase } = build({ userExists: false });
    await expect(useCase.execute(99)).rejects.toBeInstanceOf(UserNotFoundError);
  });

  it('wires orders and latest prices into the calculation', async () => {
    const { useCase, requestedIds } = build();
    const portfolio = await useCase.execute(1);

    expect(requestedIds).toEqual([[66, 47]]);
    expect(portfolio.availableCash).toBe(800);
    expect(portfolio.totalValue).toBe(1_100);
    expect(portfolio.positions).toHaveLength(1);
    expect(portfolio.positions[0]).toMatchObject({
      ticker: 'PAMP',
      quantity: 2,
      marketValue: 300,
      totalReturnPct: 50,
    });
  });
});
