import { availableCash, LedgerEntry, netQuantity, round2 } from './ledger';

// FILLED orders of user 1 in database.sql
const user1: LedgerEntry[] = [
  { instrumentId: 66, side: 'CASH_IN', size: 1_000_000, price: 1 },
  { instrumentId: 47, side: 'BUY', size: 50, price: 930 },
  { instrumentId: 47, side: 'SELL', size: 10, price: 940 },
  { instrumentId: 66, side: 'CASH_OUT', size: 100_000, price: 1 },
  { instrumentId: 31, side: 'BUY', size: 20, price: 1540 },
  { instrumentId: 54, side: 'BUY', size: 500, price: 250 },
  { instrumentId: 31, side: 'SELL', size: 30, price: 1530 },
];

describe('ledger', () => {
  it('computes the available cash', () => {
    expect(availableCash(user1)).toBe(753_000);
    expect(availableCash([])).toBe(0);
  });

  it('computes the net quantity per instrument, including negatives', () => {
    expect(netQuantity(user1, 47)).toBe(40);
    expect(netQuantity(user1, 54)).toBe(500);
    expect(netQuantity(user1, 31)).toBe(-10);
    expect(netQuantity(user1, 999)).toBe(0);
  });

  it('ignores cash movements when computing quantities', () => {
    expect(netQuantity(user1, 66)).toBe(0);
  });

  it('rounds to 2 decimals without producing -0', () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(-0.001)).toBe(0);
    expect(Object.is(round2(-0.001), 0)).toBe(true);
  });
});
