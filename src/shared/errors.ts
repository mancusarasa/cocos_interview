/**
 * Domain errors (framework-free). Each feature error extends one category; the HTTP layer
 * maps categories to status codes in a single place (`DomainExceptionFilter`).
 */
export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** The request breaks a rule and cannot be processed as sent (HTTP 400). */
export abstract class InvalidRequestError extends DomainError {}

/** A referenced entity does not exist (HTTP 404). */
export abstract class NotFoundError extends DomainError {}

/** The request conflicts with the current state of an entity (HTTP 409). */
export abstract class ConflictError extends DomainError {}

/** The request is valid but cannot be processed with the current data (HTTP 422). */
export abstract class UnprocessableError extends DomainError {}

export class UserNotFoundError extends NotFoundError {
  constructor(public readonly userId: number) {
    super(`User ${userId} not found`);
  }
}
