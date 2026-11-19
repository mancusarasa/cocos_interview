import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  InvalidOrderError,
  MarketPriceUnavailableError,
  OrderNotCancellableError,
  OrderNotFoundError,
} from '../../orders/domain/errors';
import { DomainError, UserNotFoundError } from '../../shared/errors';
import { toHttpException } from './domain-exception.filter';

describe('toHttpException', () => {
  it.each([
    [
      new InvalidOrderError('Cash cannot be traded'),
      BadRequestException,
      400,
      'Bad Request',
    ],
    [new UserNotFoundError(9), NotFoundException, 404, 'Not Found'],
    [new OrderNotFoundError(9), NotFoundException, 404, 'Not Found'],
    [
      new OrderNotCancellableError(2, 'FILLED'),
      ConflictException,
      409,
      'Conflict',
    ],
    [
      new MarketPriceUnavailableError(3),
      UnprocessableEntityException,
      422,
      'Unprocessable Entity',
    ],
  ])('maps %s', (error, type, statusCode, reason) => {
    const http = toHttpException(error);
    expect(http).toBeInstanceOf(type);
    expect(http.getResponse()).toEqual({
      statusCode,
      error: reason,
      message: error.message,
    });
  });

  it('keeps the class name of each error', () => {
    expect(new OrderNotFoundError(1).name).toBe('OrderNotFoundError');
    expect(new UserNotFoundError(1).name).toBe('UserNotFoundError');
  });

  it('rethrows a domain error outside the known categories', () => {
    class Unknown extends DomainError {}
    const error = new Unknown('boom');
    expect(() => toHttpException(error)).toThrow(error);
  });
});
