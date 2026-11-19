import {
  ConflictError,
  InvalidRequestError,
  NotFoundError,
  UnprocessableError,
} from '../../shared/errors';

/** The order cannot be placed as sent (e.g. cash instrument, amount too small). */
export class InvalidOrderError extends InvalidRequestError {}

export class InstrumentNotFoundError extends NotFoundError {
  constructor(public readonly instrumentId: number) {
    super(`Instrument ${instrumentId} not found`);
  }
}

/** A MARKET order cannot be executed because the instrument has no market data. */
export class MarketPriceUnavailableError extends UnprocessableError {
  constructor(public readonly instrumentId: number) {
    super(`No market price available for instrument ${instrumentId}`);
  }
}

export class OrderNotFoundError extends NotFoundError {
  constructor(public readonly orderId: number) {
    super(`Order ${orderId} not found`);
  }
}

/** Only NEW orders can be cancelled. */
export class OrderNotCancellableError extends ConflictError {
  constructor(
    public readonly orderId: number,
    public readonly status: string,
  ) {
    super(`Order ${orderId} is ${status}; only NEW orders can be cancelled`);
  }
}
