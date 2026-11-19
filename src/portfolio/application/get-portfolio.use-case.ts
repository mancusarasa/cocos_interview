import { Inject, Injectable, Logger } from '@nestjs/common';
import { UserNotFoundError } from '../../shared/errors';
import { Portfolio } from '../domain/portfolio';
import { calculatePortfolio } from '../domain/portfolio-calculator';
import {
  MARKET_DATA_REPOSITORY,
  MarketDataRepositoryPort,
} from './ports/market-data.repository.port';
import {
  ORDER_REPOSITORY,
  OrderRepositoryPort,
} from './ports/order.repository.port';
import {
  USER_REPOSITORY,
  UserRepositoryPort,
} from './ports/user.repository.port';

@Injectable()
export class GetPortfolioUseCase {
  private readonly logger = new Logger(GetPortfolioUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepositoryPort,
    @Inject(MARKET_DATA_REPOSITORY)
    private readonly marketData: MarketDataRepositoryPort,
  ) {}

  async execute(userId: number): Promise<Portfolio> {
    if (!(await this.users.exists(userId))) {
      throw new UserNotFoundError(userId);
    }

    const filledOrders = await this.orders.findFilledByUserId(userId);
    const instrumentIds = [...new Set(filledOrders.map((o) => o.instrumentId))];
    const latestCloses = await this.marketData.findLatestCloses(instrumentIds);

    const { portfolio, unpricedInstrumentIds } = calculatePortfolio(
      filledOrders,
      latestCloses,
    );
    if (unpricedInstrumentIds.length > 0) {
      this.logger.warn(
        `No market data for instruments [${unpricedInstrumentIds.join(', ')}] held by user ${userId}; excluded from portfolio`,
      );
    }
    return portfolio;
  }
}
