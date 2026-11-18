import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  InstrumentRepositoryPort,
  SearchTradableParams,
} from '../application/ports/instrument.repository.port';
import { Instrument } from '../domain/instrument';

/** Prisma's `contains` does not escape LIKE wildcards: make `%`, `_` and `\` match literally. */
export const escapeLike = (term: string): string =>
  term.replace(/[\\%_]/g, '\\$&');

@Injectable()
export class PrismaInstrumentRepository implements InstrumentRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async searchTradable({
    term,
    page,
    pageSize,
  }: SearchTradableParams): Promise<{ items: Instrument[]; total: number }> {
    const pattern = escapeLike(term);
    const where = {
      // ARS is modelled as an instrument of type MONEDA; it is not a tradable asset.
      type: { not: 'MONEDA' },
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
