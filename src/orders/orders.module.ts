import { Module } from '@nestjs/common';
import { INSTRUMENT_REPOSITORY } from './application/ports/instrument.repository.port';
import { MARKET_PRICE_REPOSITORY } from './application/ports/market-price.repository.port';
import { ORDER_PLACEMENT } from './application/ports/order-placement.port';
import { PlaceOrderUseCase } from './application/place-order.use-case';
import { OrdersController } from './infrastructure/orders.controller';
import { PrismaInstrumentRepository } from './infrastructure/prisma-instrument.repository';
import { PrismaMarketPriceRepository } from './infrastructure/prisma-market-price.repository';
import { PrismaOrderPlacementRepository } from './infrastructure/prisma-order-placement.repository';

@Module({
  controllers: [OrdersController],
  providers: [
    PlaceOrderUseCase,
    { provide: ORDER_PLACEMENT, useClass: PrismaOrderPlacementRepository },
    { provide: INSTRUMENT_REPOSITORY, useClass: PrismaInstrumentRepository },
    {
      provide: MARKET_PRICE_REPOSITORY,
      useClass: PrismaMarketPriceRepository,
    },
  ],
})
export class OrdersModule {}
