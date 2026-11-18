/** The request is malformed or not allowed (HTTP 400). */
export class InvalidOrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidOrderError';
  }
}

export class UserNotFoundError extends Error {
  constructor(public readonly userId: number) {
    super(`User ${userId} not found`);
    this.name = 'UserNotFoundError';
  }
}

export class InstrumentNotFoundError extends Error {
  constructor(public readonly instrumentId: number) {
    super(`Instrument ${instrumentId} not found`);
    this.name = 'InstrumentNotFoundError';
  }
}

/** A MARKET order cannot be executed because the instrument has no market data. */
export class MarketPriceUnavailableError extends Error {
  constructor(public readonly instrumentId: number) {
    super(`No market price available for instrument ${instrumentId}`);
    this.name = 'MarketPriceUnavailableError';
  }
}

export class OrderNotFoundError extends Error {
  constructor(public readonly orderId: number) {
    super(`Order ${orderId} not found`);
    this.name = 'OrderNotFoundError';
  }
}

/** Only NEW orders can be cancelled. */
export class OrderNotCancellableError extends Error {
  constructor(
    public readonly orderId: number,
    public readonly status: string,
  ) {
    super(`Order ${orderId} is ${status}; only NEW orders can be cancelled`);
    this.name = 'OrderNotCancellableError';
  }
}
