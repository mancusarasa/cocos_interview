import { Inject, Injectable } from '@nestjs/common';
import {
  InstrumentNotFoundError,
  InvalidOrderError,
  MarketPriceUnavailableError,
} from '../domain/errors';
import { CASH_INSTRUMENT_TYPE, NewOrder, PlacedOrder } from '../domain/order';
import {
  hasSufficientFunds,
  parseOrderRequest,
  resolveSize,
} from '../domain/place-order';
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
   * afford are stored as REJECTED. Invalid requests are not stored (they throw).
   */
  async execute(input: unknown): Promise<PlacedOrder> {
    const request = parseOrderRequest(input);

    const instrument = await this.instruments.findById(request.instrumentId);
    if (!instrument) throw new InstrumentNotFoundError(request.instrumentId);
    if (instrument.type === CASH_INSTRUMENT_TYPE) {
      throw new InvalidOrderError('Cash cannot be traded');
    }

    let price: number;
    if (request.type === 'MARKET') {
      const close = await this.marketPrices.findLatestClose(
        request.instrumentId,
      );
      if (close === null) {
        throw new MarketPriceUnavailableError(request.instrumentId);
      }
      price = close;
    } else {
      price = request.price as number;
    }

    const size = resolveSize(request, price);

    return this.placement.withUserLock(request.userId, async (ledger) => {
      const entries = await ledger.findFilledEntries(request.userId);
      const affordable = hasSufficientFunds(entries, {
        instrumentId: request.instrumentId,
        side: request.side,
        size,
        price,
      });

      const order: NewOrder = {
        userId: request.userId,
        instrumentId: request.instrumentId,
        side: request.side,
        type: request.type,
        size,
        price,
        status: !affordable
          ? 'REJECTED'
          : request.type === 'MARKET'
            ? 'FILLED'
            : 'NEW',
        datetime: new Date(),
      };
      return ledger.save(order);
    });
  }
}
