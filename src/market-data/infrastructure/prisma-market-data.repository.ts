import { Injectable } from '@nestjs/common';
import type { MarketPriceRepositoryPort } from '../../orders/application/ports/market-price.repository.port';
import type { MarketDataRepositoryPort } from '../../portfolio/application/ports/market-data.repository.port';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * The single adapter for market prices, so the portfolio values positions at exactly the
 * price MARKET orders execute at. Bound to each feature's own port with `useExisting`.
 */
@Injectable()
export class PrismaMarketDataRepository
  implements MarketDataRepositoryPort, MarketPriceRepositoryPort
{
  constructor(private readonly prisma: PrismaService) {}

  /** `close` of the most recent `marketdata` row per instrument. */
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

  async findLatestClose(instrumentId: number): Promise<number | null> {
    const closes = await this.findLatestCloses([instrumentId]);
    return closes.get(instrumentId) ?? null;
  }
}
