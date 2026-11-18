import { Inject, Injectable } from '@nestjs/common';
import { Instrument } from '../domain/instrument';
import {
  INSTRUMENT_REPOSITORY,
  InstrumentRepositoryPort,
} from './ports/instrument.repository.port';

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;

/** A validated search: trimmed non-empty term, page >= 1, pageSize in 1..MAX_PAGE_SIZE. */
export interface SearchInstrumentsQuery {
  term: string;
  page: number;
  pageSize: number;
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

@Injectable()
export class SearchInstrumentsUseCase {
  constructor(
    @Inject(INSTRUMENT_REPOSITORY)
    private readonly instruments: InstrumentRepositoryPort,
  ) {}

  async execute(query: SearchInstrumentsQuery): Promise<Page<Instrument>> {
    const { items, total } = await this.instruments.searchTradable(query);
    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }
}
