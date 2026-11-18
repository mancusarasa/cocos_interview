import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MarketPriceRepositoryPort } from '../application/ports/market-price.repository.port';

@Injectable()
export class PrismaMarketPriceRepository implements MarketPriceRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findLatestClose(instrumentId: number): Promise<number | null> {
    const row = await this.prisma.marketData.findFirst({
      where: { instrumentId },
      orderBy: { date: 'desc' },
      select: { close: true },
    });
    return row ? row.close.toNumber() : null;
  }
}
