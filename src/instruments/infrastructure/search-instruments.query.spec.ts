import { BadRequestException } from '@nestjs/common';
import { queryValidationPipe } from '../../common/validation/validation-pipes';
import { MAX_PAGE_SIZE } from '../application/search-instruments.use-case';
import { SearchInstrumentsQueryDto } from './search-instruments.query';

/** Runs the pipe exactly like Nest does for `@Query(queryValidationPipe)`. */
const parse = (query: Record<string, unknown>) =>
  queryValidationPipe.transform(query, {
    type: 'query',
    metatype: SearchInstrumentsQueryDto,
  }) as Promise<SearchInstrumentsQueryDto>;

describe('SearchInstrumentsQueryDto', () => {
  it('trims the term and applies the default pagination', async () => {
    const dto = await parse({ search: '  pamp ' });
    expect(dto).toMatchObject({ search: 'pamp', page: 1, pageSize: 10 });
  });

  it('converts page and pageSize from strings', async () => {
    const dto = await parse({
      search: 'a',
      page: '3',
      pageSize: String(MAX_PAGE_SIZE),
    });
    expect(dto).toMatchObject({ page: 3, pageSize: MAX_PAGE_SIZE });
  });

  it('drops unknown query params', async () => {
    const dto = await parse({ search: 'a', foo: 'bar' });
    expect(dto).not.toHaveProperty('foo');
  });

  it('reports one message per field, type error first', async () => {
    const error = (await parse({ page: 'abc' }).catch(
      (e: unknown) => e,
    )) as BadRequestException;
    expect(error.getResponse()).toEqual({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Validation failed',
      errors: ['search must be a string', 'page must be an integer number'],
    });
  });

  it.each([
    ['missing search', {}],
    ['blank search', { search: '' }],
    ['whitespace search', { search: '   ' }],
    ['repeated search', { search: ['a', 'b'] }],
    ['page 0', { search: 'a', page: '0' }],
    ['negative page', { search: 'a', page: '-1' }],
    ['non-numeric page', { search: 'a', page: 'abc' }],
    ['fractional pageSize', { search: 'a', pageSize: '1.5' }],
    ['pageSize 0', { search: 'a', pageSize: '0' }],
    [
      'pageSize above the max',
      { search: 'a', pageSize: String(MAX_PAGE_SIZE + 1) },
    ],
  ])('rejects %s', async (_name, query) => {
    await expect(parse(query)).rejects.toBeInstanceOf(BadRequestException);
  });
});
