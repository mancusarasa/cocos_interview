import { LedgerEntry, OrderSide } from '../../shared/ledger';

export type { OrderSide };

/** A FILLED order, enriched with the data of its instrument. */
export interface FilledOrder extends LedgerEntry {
  ticker: string;
  name: string;
  /** e.g. 'ACCIONES' or 'MONEDA' (cash). */
  instrumentType: string;
}
