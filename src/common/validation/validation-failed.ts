import { BadRequestException, ValidationError } from '@nestjs/common';

/**
 * 400 for invalid input, with the same top-level shape as every other error
 * (`message` is a string) plus one entry per problem in `errors`.
 */
export function validationFailed(errors: string[]): BadRequestException {
  // Same key order as Nest's own exception bodies ({ message, error, statusCode }).
  return new BadRequestException({
    message: 'Validation failed',
    errors,
    error: 'Bad Request',
    statusCode: 400,
  });
}

/** Flattens class-validator errors (nested ones included) into messages, in order. */
export function flattenValidationErrors(errors: ValidationError[]): string[] {
  return errors.flatMap((e) => [
    ...Object.values(e.constraints ?? {}),
    ...flattenValidationErrors(e.children ?? []),
  ]);
}
