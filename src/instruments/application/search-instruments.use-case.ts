import { Inject, Injectable } from '@nestjs/common';
import { InvalidSearchQueryError } from '../domain/errors';
import { Instrument } from '../domain/instrument';
import {
  INSTRUMENT_REPOSITORY,
  InstrumentRepositoryPort,
} from './ports/instrument.repository.port';

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;

export interface SearchInstrumentsQuery {
  search?: unknown;
  page?: number;
  pageSize?: number;
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
    const term = typeof query.search === 'string' ? query.search.trim() : '';
    if (term === '') {
      throw new InvalidSearchQueryError('`search` must be a non-empty string');
    }

    const page = query.page ?? DEFAULT_PAGE;
    if (!Number.isInteger(page) || page < 1) {
      throw new InvalidSearchQueryError('`page` must be an integer >= 1');
    }

    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    if (
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > MAX_PAGE_SIZE
    ) {
      throw new InvalidSearchQueryError(
        `\`pageSize\` must be an integer between 1 and ${MAX_PAGE_SIZE}`,
      );
    }

    const { items, total } = await this.instruments.searchTradable({
      term,
      page,
      pageSize,
    });

    return {
      items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
