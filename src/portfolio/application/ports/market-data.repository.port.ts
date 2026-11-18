export const MARKET_DATA_REPOSITORY = Symbol('MARKET_DATA_REPOSITORY');

export interface MarketDataRepositoryPort {
  /** Latest closing price (ARS) per instrument id. Instruments without data are absent. */
  findLatestCloses(instrumentIds: number[]): Promise<Map<number, number>>;
}
