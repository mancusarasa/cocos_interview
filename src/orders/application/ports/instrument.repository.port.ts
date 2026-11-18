export const INSTRUMENT_REPOSITORY = Symbol('ORDERS_INSTRUMENT_REPOSITORY');

export interface InstrumentRepositoryPort {
  findById(id: number): Promise<{ id: number; type: string } | null>;
}
