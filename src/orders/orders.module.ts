import { Module } from '@nestjs/common';
import { CancelOrderUseCase } from './application/cancel-order.use-case';
import { INSTRUMENT_REPOSITORY } from './application/ports/instrument.repository.port';
import { ORDER_CANCELLATION } from './application/ports/order-cancellation.port';
import { MARKET_PRICE_REPOSITORY } from './application/ports/market-price.repository.port';
import { ORDER_PLACEMENT } from './application/ports/order-placement.port';
import { PlaceOrderUseCase } from './application/place-order.use-case';
import { OrdersController } from './infrastructure/orders.controller';
import { PrismaInstrumentRepository } from './infrastructure/prisma-instrument.repository';
import { PrismaOrderCancellationRepository } from './infrastructure/prisma-order-cancellation.repository';
import { PrismaMarketPriceRepository } from './infrastructure/prisma-market-price.repository';
import { PrismaOrderPlacementRepository } from './infrastructure/prisma-order-placement.repository';

@Module({
  controllers: [OrdersController],
  providers: [
    PlaceOrderUseCase,
    CancelOrderUseCase,
    { provide: ORDER_PLACEMENT, useClass: PrismaOrderPlacementRepository },
    { provide: INSTRUMENT_REPOSITORY, useClass: PrismaInstrumentRepository },
    {
      provide: ORDER_CANCELLATION,
      useClass: PrismaOrderCancellationRepository,
    },
    {
      provide: MARKET_PRICE_REPOSITORY,
      useClass: PrismaMarketPriceRepository,
    },
  ],
})
export class OrdersModule {}
