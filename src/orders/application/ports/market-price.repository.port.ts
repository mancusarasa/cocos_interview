export const MARKET_PRICE_REPOSITORY = Symbol('ORDERS_MARKET_PRICE_REPOSITORY');

export interface MarketPriceRepositoryPort {
  /** Latest closing price (ARS) of the instrument, or null if there is no market data. */
  findLatestClose(instrumentId: number): Promise<number | null>;
}
