import { Module } from '@nestjs/common';
import { PrismaMarketDataRepository } from './infrastructure/prisma-market-data.repository';

/** Shared market data access, used by the portfolio and orders features. */
@Module({
  providers: [PrismaMarketDataRepository],
  exports: [PrismaMarketDataRepository],
})
export class MarketDataModule {}
