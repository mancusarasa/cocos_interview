import { availableCash, round2 } from '../../shared/ledger';
import { FilledOrder } from './filled-order';
import { Portfolio, Position } from './portfolio';

export const CASH_INSTRUMENT_TYPE = 'MONEDA';

export interface PortfolioCalculation {
  portfolio: Portfolio;
  /** Instruments held but with no market price: left out of the portfolio. */
  unpricedInstrumentIds: number[];
}

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
  interface Acc {
    ticker: string;
    name: string;
    bought: number;
    sold: number;
    boughtCost: number;
  }
  const byInstrument = new Map<number, Acc>();

  for (const o of filledOrders) {
    // Cash movements only affect the available cash (see availableCash below).
    if (o.side !== 'BUY' && o.side !== 'SELL') continue;

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

  const cash = round2(availableCash(filledOrders));
  const totalValue = round2(
    cash + positions.reduce((sum, p) => sum + p.marketValue, 0),
  );

  return {
    portfolio: { totalValue, availableCash: cash, positions },
    unpricedInstrumentIds,
  };
}
