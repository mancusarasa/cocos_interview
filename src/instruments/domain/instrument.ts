export interface Instrument {
  id: number;
  ticker: string;
  name: string;
  /** e.g. 'ACCIONES'. */
  type: string;
}
