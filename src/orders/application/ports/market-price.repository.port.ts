export const MARKET_PRICE_REPOSITORY = Symbol(
  'orders/MarketPriceRepositoryPort',
);

export interface MarketPriceRepositoryPort {
  /** Latest closing price (ARS) of the instrument, or null if there is no market data. */
  findLatestClose(instrumentId: number): Promise<number | null>;
}
