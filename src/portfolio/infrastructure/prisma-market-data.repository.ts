import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MarketDataRepositoryPort } from '../application/ports/market-data.repository.port';

@Injectable()
export class PrismaMarketDataRepository implements MarketDataRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findLatestCloses(
    instrumentIds: number[],
  ): Promise<Map<number, number>> {
    if (instrumentIds.length === 0) return new Map();

    // Newest row first per instrument; `distinct` keeps the first one.
    const rows = await this.prisma.marketData.findMany({
      where: { instrumentId: { in: instrumentIds } },
      orderBy: [{ instrumentId: 'asc' }, { date: 'desc' }],
      distinct: ['instrumentId'],
      select: { instrumentId: true, close: true },
    });

    return new Map(rows.map((r) => [r.instrumentId, r.close.toNumber()]));
  }
}
