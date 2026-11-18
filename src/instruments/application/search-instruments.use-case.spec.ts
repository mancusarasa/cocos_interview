import { InvalidSearchQueryError } from '../domain/errors';
import { Instrument } from '../domain/instrument';
import {
  InstrumentRepositoryPort,
  SearchTradableParams,
} from './ports/instrument.repository.port';
import {
  MAX_PAGE_SIZE,
  SearchInstrumentsUseCase,
} from './search-instruments.use-case';

const pamp: Instrument = {
  id: 47,
  ticker: 'PAMP',
  name: 'Pampa Holding S.A.',
  type: 'ACCIONES',
};

function build(total = 1) {
  const calls: SearchTradableParams[] = [];
  const repo: InstrumentRepositoryPort = {
    searchTradable: async (params) => {
      calls.push(params);
      return { items: [pamp], total };
    },
  };
  return { useCase: new SearchInstrumentsUseCase(repo), calls };
}

describe('SearchInstrumentsUseCase', () => {
  it('trims the term and applies the default pagination', async () => {
    const { useCase, calls } = build();
    const result = await useCase.execute({ search: '  pamp ' });

    expect(calls).toEqual([{ term: 'pamp', page: 1, pageSize: 10 }]);
    expect(result).toEqual({
      items: [pamp],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
  });

  it.each([undefined, '', '   ', ['a', 'b'], 42])(
    'rejects an invalid term (%p)',
    async (search) => {
      const { useCase, calls } = build();
      await expect(useCase.execute({ search })).rejects.toBeInstanceOf(
        InvalidSearchQueryError,
      );
      expect(calls).toEqual([]);
    },
  );

  it.each([
    { page: 0 },
    { page: -1 },
    { page: 1.5 },
    { pageSize: 0 },
    { pageSize: MAX_PAGE_SIZE + 1 },
    { pageSize: 2.5 },
  ])('rejects invalid pagination %p', async (pagination) => {
    const { useCase } = build();
    await expect(
      useCase.execute({ search: 'a', ...pagination }),
    ).rejects.toBeInstanceOf(InvalidSearchQueryError);
  });

  it('accepts the maximum page size', async () => {
    const { useCase, calls } = build();
    await useCase.execute({ search: 'a', pageSize: MAX_PAGE_SIZE });
    expect(calls[0].pageSize).toBe(MAX_PAGE_SIZE);
  });

  it('computes totalPages from total and pageSize', async () => {
    const { useCase } = build(23);
    const result = await useCase.execute({
      search: 'a',
      page: 3,
      pageSize: 10,
    });
    expect(result).toMatchObject({
      page: 3,
      pageSize: 10,
      total: 23,
      totalPages: 3,
    });
  });

  it('returns zero pages when nothing matches', async () => {
    const repo: InstrumentRepositoryPort = {
      searchTradable: async () => ({ items: [], total: 0 }),
    };
    const result = await new SearchInstrumentsUseCase(repo).execute({
      search: 'zzz',
    });
    expect(result).toEqual({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 0,
    });
  });
});
