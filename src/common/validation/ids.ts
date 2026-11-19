import {
  applyDecorators,
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { IsInt, Max, Min } from 'class-validator';
import { MAX_INT4 } from '../../shared/limits';

const idRangeMessage = (name: string) =>
  `${name} must be an integer between 1 and ${MAX_INT4}`;

/**
 * Route param pipe for database ids (`SERIAL`, i.e. INT4): accepts only integers in
 * 1..MAX_INT4 and returns 400 otherwise. Unlike `ParseIntPipe`, it rejects values the
 * database cannot hold, which would otherwise fail in Prisma with a 500.
 */
@Injectable()
export class ParseIdPipe implements PipeTransform<string, number> {
  transform(value: string, metadata: ArgumentMetadata): number {
    const id = /^\d+$/.test(value) ? Number(value) : NaN;
    if (!Number.isSafeInteger(id) || id < 1 || id > MAX_INT4) {
      throw new BadRequestException(idRangeMessage(metadata.data ?? 'id'));
    }
    return id;
  }
}

/** DTO property decorator for database ids: integer in 1..MAX_INT4. */
export const IsId = () =>
  // Registered (and, with stopAtFirstError, reported) in this order.
  applyDecorators(
    IsInt(),
    Min(1, { message: ({ property }) => idRangeMessage(property) }),
    Max(MAX_INT4, { message: ({ property }) => idRangeMessage(property) }),
  );
