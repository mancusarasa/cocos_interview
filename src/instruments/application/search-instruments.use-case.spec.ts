import { Instrument } from '../domain/instrument';
import {
  InstrumentRepositoryPort,
  SearchTradableParams,
} from './ports/instrument.repository.port';
import { SearchInstrumentsUseCase } from './search-instruments.use-case';

const pamp: Instrument = {
  id: 47,
  ticker: 'PAMP',
  name: 'Pampa Holding S.A.',
  type: 'ACCIONES',
};

function build(total: number, items: Instrument[] = [pamp]) {
  const calls: SearchTradableParams[] = [];
  const repo: InstrumentRepositoryPort = {
    searchTradable: async (params) => {
      calls.push(params);
      return { items, total };
    },
  };
  return { useCase: new SearchInstrumentsUseCase(repo), calls };
}

describe('SearchInstrumentsUseCase', () => {
  it('passes the query to the port and wraps the result in a page', async () => {
    const { useCase, calls } = build(1);
    const result = await useCase.execute({
      term: 'pamp',
      page: 1,
      pageSize: 10,
    });

    expect(calls).toEqual([{ term: 'pamp', page: 1, pageSize: 10 }]);
    expect(result).toEqual({
      items: [pamp],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
  });

  it('computes totalPages from total and pageSize', async () => {
    const { useCase } = build(23);
    const result = await useCase.execute({ term: 'a', page: 3, pageSize: 10 });
    expect(result).toMatchObject({
      page: 3,
      pageSize: 10,
      total: 23,
      totalPages: 3,
    });
  });

  it('returns zero pages when nothing matches', async () => {
    const { useCase } = build(0, []);
    const result = await useCase.execute({
      term: 'zzz',
      page: 1,
      pageSize: 10,
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
