export const INSTRUMENT_REPOSITORY = Symbol('orders/InstrumentRepositoryPort');

export interface InstrumentRepositoryPort {
  findById(id: number): Promise<{ id: number; type: string } | null>;
}
