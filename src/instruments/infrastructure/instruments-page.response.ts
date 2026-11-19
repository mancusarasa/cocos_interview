import { Page } from '../application/search-instruments.use-case';
import { Instrument } from '../domain/instrument';

export class InstrumentResponse {
  id!: number;
  ticker!: string;
  name!: string;
  type!: string;

  static from(instrument: Instrument): InstrumentResponse {
    return Object.assign(new InstrumentResponse(), {
      id: instrument.id,
      ticker: instrument.ticker,
      name: instrument.name,
      type: instrument.type,
    });
  }
}

/** HTTP representation of GET /instruments. */
export class InstrumentsPageResponse {
  items!: InstrumentResponse[];
  page!: number;
  pageSize!: number;
  total!: number;
  totalPages!: number;

  static from(page: Page<Instrument>): InstrumentsPageResponse {
    return Object.assign(new InstrumentsPageResponse(), {
      items: page.items.map((i) => InstrumentResponse.from(i)),
      page: page.page,
      pageSize: page.pageSize,
      total: page.total,
      totalPages: page.totalPages,
    });
  }
}
