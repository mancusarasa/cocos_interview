import { Inject, Injectable } from '@nestjs/common';
import {
  InstrumentNotFoundError,
  InvalidOrderError,
  MarketPriceUnavailableError,
} from '../domain/errors';
import { CASH_INSTRUMENT_TYPE } from '../../shared/instruments';
import { NewOrder, PlaceOrderCommand, PlacedOrder } from '../domain/order';
import { hasSufficientFunds, resolveSize } from '../domain/place-order';
import {
  INSTRUMENT_REPOSITORY,
  InstrumentRepositoryPort,
} from './ports/instrument.repository.port';
import {
  MARKET_PRICE_REPOSITORY,
  MarketPriceRepositoryPort,
} from './ports/market-price.repository.port';
import {
  ORDER_PLACEMENT,
  OrderPlacementPort,
} from './ports/order-placement.port';

@Injectable()
export class PlaceOrderUseCase {
  constructor(
    @Inject(ORDER_PLACEMENT) private readonly placement: OrderPlacementPort,
    @Inject(INSTRUMENT_REPOSITORY)
    private readonly instruments: InstrumentRepositoryPort,
    @Inject(MARKET_PRICE_REPOSITORY)
    private readonly marketPrices: MarketPriceRepositoryPort,
  ) {}

  /**
   * Places an order. MARKET orders execute immediately at the latest close (FILLED);
   * LIMIT orders are left NEW (the market is not simulated). Orders the user cannot
   * afford are stored as REJECTED. Requests that break a business rule are not stored
   * (they throw).
   */
  async execute(command: PlaceOrderCommand): Promise<PlacedOrder> {
    const instrument = await this.instruments.findById(command.instrumentId);
    if (!instrument) throw new InstrumentNotFoundError(command.instrumentId);
    if (instrument.type === CASH_INSTRUMENT_TYPE) {
      throw new InvalidOrderError('Cash cannot be traded');
    }

    const price =
      command.type === 'LIMIT'
        ? command.price
        : await this.latestClose(command.instrumentId);
    const size = resolveSize(command.quantity, price);

    return this.placement.withUserLock(command.userId, async (ledger) => {
      const entries = await ledger.findFilledEntries(command.userId);
      const affordable = hasSufficientFunds(entries, {
        instrumentId: command.instrumentId,
        side: command.side,
        size,
        price,
      });

      const order: NewOrder = {
        userId: command.userId,
        instrumentId: command.instrumentId,
        side: command.side,
        type: command.type,
        size,
        price,
        status: !affordable
          ? 'REJECTED'
          : command.type === 'MARKET'
            ? 'FILLED'
            : 'NEW',
        datetime: new Date(),
      };
      return ledger.save(order);
    });
  }

  private async latestClose(instrumentId: number): Promise<number> {
    const close = await this.marketPrices.findLatestClose(instrumentId);
    if (close === null) throw new MarketPriceUnavailableError(instrumentId);
    return close;
  }
}
