import { LedgerEntry } from '../../shared/ledger';
import { InstrumentRepositoryPort } from '../application/ports/instrument.repository.port';
import { MarketPriceRepositoryPort } from '../application/ports/market-price.repository.port';
import { OrderCancellationPort } from '../application/ports/order-cancellation.port';
import {
  OrderLedger,
  OrderPlacementPort,
} from '../application/ports/order-placement.port';
import { UserNotFoundError } from '../../shared/errors';
import { NewOrder, PlacedOrder } from '../domain/order';

/**
 * In-memory orders store for tests (unit and e2e), implementing both the placement and
 * the cancellation ports. FILLED orders become ledger entries right away, so later
 * orders see their effect, like with the real database.
 */
export class InMemoryOrderPlacement
  implements OrderPlacementPort, OrderCancellationPort
{
  /** Every order saved so far, whatever its status (current state). */
  readonly saved: PlacedOrder[] = [];
  private nextId = 1;

  constructor(private readonly users: Map<number, LedgerEntry[]>) {}

  /** Adds an existing order as is (e.g. a FILLED or REJECTED fixture), without ledger effects. */
  seed(order: Omit<PlacedOrder, 'id'>): PlacedOrder {
    const placed: PlacedOrder = { ...order, id: this.nextId++ };
    this.saved.push(placed);
    return { ...placed };
  }

  async cancelIfNew(orderId: number): Promise<PlacedOrder | null> {
    const index = this.saved.findIndex(
      (o) => o.id === orderId && o.status === 'NEW',
    );
    if (index === -1) return null;
    const cancelled: PlacedOrder = {
      ...this.saved[index],
      status: 'CANCELLED',
    };
    this.saved[index] = cancelled;
    return { ...cancelled };
  }

  async findById(orderId: number): Promise<PlacedOrder | null> {
    const order = this.saved.find((o) => o.id === orderId);
    return order ? { ...order } : null;
  }

  async withUserLock<T>(
    userId: number,
    work: (ledger: OrderLedger) => Promise<T>,
  ): Promise<T> {
    const entries = this.users.get(userId);
    if (!entries) throw new UserNotFoundError(userId);

    return work({
      findFilledEntries: async () => [...entries],
      save: async (order: NewOrder) => {
        const placed: PlacedOrder = { ...order, id: this.nextId++ };
        this.saved.push({ ...placed });
        if (placed.status === 'FILLED') {
          entries.push({
            instrumentId: placed.instrumentId,
            side: placed.side,
            size: placed.size,
            price: placed.price,
          });
        }
        return placed;
      },
    });
  }
}

export class InMemoryInstruments implements InstrumentRepositoryPort {
  constructor(private readonly types: Map<number, string>) {}

  async findById(id: number) {
    const type = this.types.get(id);
    return type === undefined ? null : { id, type };
  }
}

export class InMemoryMarketPrices implements MarketPriceRepositoryPort {
  constructor(private readonly closes: Map<number, number>) {}

  async findLatestClose(instrumentId: number) {
    return this.closes.get(instrumentId) ?? null;
  }
}

/** Seeded user 1 of database.sql: cash 753000, PAMP(47) x40, METR(54) x500, BMA(31) x-10. */
export function seededUser1Entries(): LedgerEntry[] {
  return [
    { instrumentId: 66, side: 'CASH_IN', size: 1_000_000, price: 1 },
    { instrumentId: 47, side: 'BUY', size: 50, price: 930 },
    { instrumentId: 47, side: 'SELL', size: 10, price: 940 },
    { instrumentId: 66, side: 'CASH_OUT', size: 100_000, price: 1 },
    { instrumentId: 31, side: 'BUY', size: 20, price: 1540 },
    { instrumentId: 54, side: 'BUY', size: 500, price: 250 },
    { instrumentId: 31, side: 'SELL', size: 30, price: 1530 },
  ];
}

export function buildFakes() {
  const placement = new InMemoryOrderPlacement(
    new Map([
      [1, seededUser1Entries()],
      [2, []],
    ]),
  );
  const instruments = new InMemoryInstruments(
    new Map([
      [47, 'ACCIONES'], // PAMP, close 925.85
      [31, 'ACCIONES'], // BMA, close 1502.80
      [7, 'ACCIONES'], // no market data
      [66, 'MONEDA'], // ARS
    ]),
  );
  const marketPrices = new InMemoryMarketPrices(
    new Map([
      [47, 925.85],
      [31, 1502.8],
    ]),
  );
  return { placement, instruments, marketPrices };
}
