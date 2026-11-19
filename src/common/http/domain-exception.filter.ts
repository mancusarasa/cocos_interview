import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  HttpException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import {
  ConflictError,
  DomainError,
  InvalidRequestError,
  NotFoundError,
  UnprocessableError,
} from '../../shared/errors';

/** Maps a domain error category to its HTTP exception (standard Nest body). */
export function toHttpException(error: DomainError): HttpException {
  if (error instanceof InvalidRequestError) {
    return new BadRequestException(error.message);
  }
  if (error instanceof NotFoundError) {
    return new NotFoundException(error.message);
  }
  if (error instanceof ConflictError) {
    return new ConflictException(error.message);
  }
  if (error instanceof UnprocessableError) {
    return new UnprocessableEntityException(error.message);
  }
  // A DomainError outside the known categories is a programming error.
  throw error;
}

/**
 * The single place where domain errors become HTTP responses, so controllers only call
 * use cases. Registered globally with APP_FILTER in AppModule.
 */
@Catch(DomainError)
export class DomainExceptionFilter extends BaseExceptionFilter {
  catch(error: DomainError, host: ArgumentsHost): void {
    super.catch(toHttpException(error), host);
  }
}
