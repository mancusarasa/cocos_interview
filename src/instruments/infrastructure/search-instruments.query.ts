import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '../application/search-instruments.use-case';

/**
 * Query string of GET /instruments. Validated by `queryValidationPipe`.
 * Decorators run bottom-up: the type check is listed last so it is reported first.
 */
export class SearchInstrumentsQueryDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsNotEmpty()
  @IsString()
  search!: string;

  @Type(() => Number)
  @Min(1)
  @IsInt()
  page: number = DEFAULT_PAGE;

  @Type(() => Number)
  @Max(MAX_PAGE_SIZE)
  @Min(1)
  @IsInt()
  pageSize: number = DEFAULT_PAGE_SIZE;
}
