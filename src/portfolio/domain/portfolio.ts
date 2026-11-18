export interface Position {
  instrumentId: number;
  ticker: string;
  name: string;
  /** Net quantity (BUY - SELL). Can be negative if the order history oversells. */
  quantity: number;
  /** quantity * latest close, in ARS. */
  marketValue: number;
  /** Return vs. weighted average buy cost, in %. null when it is not meaningful. */
  totalReturnPct: number | null;
}

export interface Portfolio {
  /** availableCash + sum of positions' market value, in ARS. */
  totalValue: number;
  /** ARS available to trade. */
  availableCash: number;
  positions: Position[];
}
