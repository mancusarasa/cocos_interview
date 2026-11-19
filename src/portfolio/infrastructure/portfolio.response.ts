import { Portfolio, Position } from '../domain/portfolio';

export class PositionResponse {
  instrumentId!: number;
  ticker!: string;
  name!: string;
  quantity!: number;
  /** ARS. */
  marketValue!: number;
  /** % vs. weighted average buy cost; null when not meaningful (e.g. negative position). */
  totalReturnPct!: number | null;

  static from(position: Position): PositionResponse {
    return Object.assign(new PositionResponse(), {
      instrumentId: position.instrumentId,
      ticker: position.ticker,
      name: position.name,
      quantity: position.quantity,
      marketValue: position.marketValue,
      totalReturnPct: position.totalReturnPct,
    });
  }
}

/** HTTP representation of GET /users/:userId/portfolio. */
export class PortfolioResponse {
  userId!: number;
  /** ARS: availableCash + sum of positions' market value. */
  totalValue!: number;
  /** ARS available to trade. */
  availableCash!: number;
  positions!: PositionResponse[];

  static from(userId: number, portfolio: Portfolio): PortfolioResponse {
    return Object.assign(new PortfolioResponse(), {
      userId,
      totalValue: portfolio.totalValue,
      availableCash: portfolio.availableCash,
      positions: portfolio.positions.map((p) => PositionResponse.from(p)),
    });
  }
}
