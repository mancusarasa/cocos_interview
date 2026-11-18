import { Module } from '@nestjs/common';
import { GetPortfolioUseCase } from './application/get-portfolio.use-case';
import { MARKET_DATA_REPOSITORY } from './application/ports/market-data.repository.port';
import { ORDER_REPOSITORY } from './application/ports/order.repository.port';
import { USER_REPOSITORY } from './application/ports/user.repository.port';
import { PortfolioController } from './infrastructure/portfolio.controller';
import { PrismaMarketDataRepository } from './infrastructure/prisma-market-data.repository';
import { PrismaOrderRepository } from './infrastructure/prisma-order.repository';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';

@Module({
  controllers: [PortfolioController],
  providers: [
    GetPortfolioUseCase,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: ORDER_REPOSITORY, useClass: PrismaOrderRepository },
    { provide: MARKET_DATA_REPOSITORY, useClass: PrismaMarketDataRepository },
  ],
})
export class PortfolioModule {}
