import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CASH_INSTRUMENT_TYPE } from '../../shared/instruments';
import {
  InstrumentRepositoryPort,
  SearchTradableParams,
} from '../application/ports/instrument.repository.port';
import type { InstrumentRepositoryPort as OrdersInstrumentRepositoryPort } from '../../orders/application/ports/instrument.repository.port';
import { Instrument } from '../domain/instrument';

/** Prisma's `contains` does not escape LIKE wildcards: make `%`, `_` and `\` match literally. */
export const escapeLike = (term: string): string =>
  term.replace(/[\\%_]/g, '\\$&');

@Injectable()
/** Instrument persistence; also bound to the orders feature's instrument port. */
export class PrismaInstrumentRepository
  implements InstrumentRepositoryPort, OrdersInstrumentRepositoryPort
{
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<Instrument | null> {
    const row = await this.prisma.instrument.findUnique({ where: { id } });
    return row
      ? { id: row.id, ticker: row.ticker, name: row.name, type: row.type }
      : null;
  }

  async searchTradable({
    term,
    page,
    pageSize,
  }: SearchTradableParams): Promise<{ items: Instrument[]; total: number }> {
    const pattern = escapeLike(term);
    const where = {
      // ARS is modelled as an instrument of type MONEDA; it is not a tradable asset.
      type: { not: CASH_INSTRUMENT_TYPE },
      OR: [
        { ticker: { contains: pattern, mode: 'insensitive' as const } },
        { name: { contains: pattern, mode: 'insensitive' as const } },
      ],
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.instrument.findMany({
        where,
        // `id` as tie-breaker keeps pagination stable.
        orderBy: [{ ticker: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.instrument.count({ where }),
    ]);

    return {
      items: rows.map(({ id, ticker, name, type }) => ({
        id,
        ticker,
        name,
        type,
      })),
      total,
    };
  }
}
