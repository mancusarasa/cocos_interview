import { Instrument } from '../../domain/instrument';

export const INSTRUMENT_REPOSITORY = Symbol('INSTRUMENT_REPOSITORY');

export interface SearchTradableParams {
  /** Already trimmed and non-empty. */
  term: string;
  /** 1-based. */
  page: number;
  pageSize: number;
}

export interface InstrumentRepositoryPort {
  /**
   * Tradable instruments (cash is excluded) whose ticker or name contains `term`
   * (case-insensitive), ordered by ticker, plus the total number of matches.
   */
  searchTradable(
    params: SearchTradableParams,
  ): Promise<{ items: Instrument[]; total: number }>;
}
