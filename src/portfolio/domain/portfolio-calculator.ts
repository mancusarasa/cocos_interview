import { FilledOrder } from './filled-order';
import { Portfolio, Position } from './portfolio';

export const CASH_INSTRUMENT_TYPE = 'MONEDA';

export interface PortfolioCalculation {
  portfolio: Portfolio;
  /** Instruments held but with no market price: left out of the portfolio. */
  unpricedInstrumentIds: number[];
}

/** Rounds to 2 decimals (and normalizes -0 to 0). */
const round2 = (n: number): number =>
  Math.round((n + Number.EPSILON) * 100) / 100 + 0;

/**
 * Pure portfolio calculation from FILLED orders and latest closing prices.
 * - cash: CASH_IN/CASH_OUT move `size` pesos; BUY/SELL move `size * price`.
 * - position quantity: sum(BUY) - sum(SELL); zero positions are omitted, negative ones kept.
 * - total return: (close - avg buy cost) / avg buy cost, null if quantity <= 0 or no BUYs.
 */
export function calculatePortfolio(
  filledOrders: FilledOrder[],
  latestCloses: ReadonlyMap<number, number>,
): PortfolioCalculation {
  let cash = 0;

  interface Acc {
    ticker: string;
    name: string;
    bought: number;
    sold: number;
    boughtCost: number;
  }
  const byInstrument = new Map<number, Acc>();

  for (const o of filledOrders) {
    switch (o.side) {
      case 'CASH_IN':
        cash += o.size;
        continue;
      case 'CASH_OUT':
        cash -= o.size;
        continue;
      case 'BUY':
        cash -= o.size * o.price;
        break;
      case 'SELL':
        cash += o.size * o.price;
        break;
    }

    if (o.instrumentType === CASH_INSTRUMENT_TYPE) continue;

    const acc = byInstrument.get(o.instrumentId) ?? {
      ticker: o.ticker,
      name: o.name,
      bought: 0,
      sold: 0,
      boughtCost: 0,
    };
    if (o.side === 'BUY') {
      acc.bought += o.size;
      acc.boughtCost += o.size * o.price;
    } else {
      acc.sold += o.size;
    }
    byInstrument.set(o.instrumentId, acc);
  }

  const positions: Position[] = [];
  const unpricedInstrumentIds: number[] = [];

  for (const [instrumentId, acc] of byInstrument) {
    const quantity = acc.bought - acc.sold;
    if (quantity === 0) continue;

    const close = latestCloses.get(instrumentId);
    if (close === undefined) {
      unpricedInstrumentIds.push(instrumentId);
      continue;
    }

    const avgBuyCost = acc.bought > 0 ? acc.boughtCost / acc.bought : 0;
    const totalReturnPct =
      quantity > 0 && avgBuyCost > 0
        ? round2(((close - avgBuyCost) / avgBuyCost) * 100)
        : null;

    positions.push({
      instrumentId,
      ticker: acc.ticker,
      name: acc.name,
      quantity,
      marketValue: round2(quantity * close),
      totalReturnPct,
    });
  }

  positions.sort((a, b) => a.instrumentId - b.instrumentId);

  const availableCash = round2(cash);
  const totalValue = round2(
    availableCash + positions.reduce((sum, p) => sum + p.marketValue, 0),
  );

  return {
    portfolio: { totalValue, availableCash, positions },
    unpricedInstrumentIds,
  };
}
