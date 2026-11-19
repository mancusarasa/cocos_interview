import { Module } from '@nestjs/common';
import { PrismaInstrumentRepository } from '../instruments/infrastructure/prisma-instrument.repository';
import { InstrumentsModule } from '../instruments/instruments.module';
import { PrismaMarketDataRepository } from '../market-data/infrastructure/prisma-market-data.repository';
import { MarketDataModule } from '../market-data/market-data.module';
import { CancelOrderUseCase } from './application/cancel-order.use-case';
import { INSTRUMENT_REPOSITORY } from './application/ports/instrument.repository.port';
import { MARKET_PRICE_REPOSITORY } from './application/ports/market-price.repository.port';
import { ORDER_CANCELLATION } from './application/ports/order-cancellation.port';
import { ORDER_PLACEMENT } from './application/ports/order-placement.port';
import { PlaceOrderUseCase } from './application/place-order.use-case';
import { OrdersController } from './infrastructure/orders.controller';
import { PrismaOrderCancellationRepository } from './infrastructure/prisma-order-cancellation.repository';
import { PrismaOrderPlacementRepository } from './infrastructure/prisma-order-placement.repository';

@Module({
  imports: [InstrumentsModule, MarketDataModule],
  controllers: [OrdersController],
  providers: [
    PlaceOrderUseCase,
    CancelOrderUseCase,
    { provide: ORDER_PLACEMENT, useClass: PrismaOrderPlacementRepository },
    {
      provide: ORDER_CANCELLATION,
      useClass: PrismaOrderCancellationRepository,
    },
    // Shared adapters, bound to this feature's own ports.
    { provide: INSTRUMENT_REPOSITORY, useExisting: PrismaInstrumentRepository },
    {
      provide: MARKET_PRICE_REPOSITORY,
      useExisting: PrismaMarketDataRepository,
    },
  ],
})
export class OrdersModule {}
