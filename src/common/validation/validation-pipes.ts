import { ValidationPipe } from '@nestjs/common';
import { flattenValidationErrors, validationFailed } from './validation-failed';

// `stopAtFirstError`: one message per field. class-validator runs a property's
// decorators bottom-up, so DTOs list the basic type check last (it runs first).

/**
 * Request bodies: unknown fields are rejected and no implicit type conversion happens
 * (e.g. `"size": "3"` is a 400, not 3).
 */
export const bodyValidationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  stopAtFirstError: true,
  exceptionFactory: (errors) =>
    validationFailed(flattenValidationErrors(errors)),
});

/**
 * Query strings: every value arrives as a string, so DTOs convert explicitly with
 * `@Type(() => Number)`. Unknown query params are dropped rather than rejected.
 */
export const queryValidationPipe = new ValidationPipe({
  whitelist: true,
  transform: true,
  stopAtFirstError: true,
  exceptionFactory: (errors) =>
    validationFailed(flattenValidationErrors(errors)),
});
