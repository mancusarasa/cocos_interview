import { BadRequestException } from '@nestjs/common';
import { MAX_INT4 } from '../../shared/limits';
import { ParseIdPipe } from './ids';

describe('ParseIdPipe', () => {
  const pipe = new ParseIdPipe();
  const parse = (value: string) =>
    pipe.transform(value, { type: 'param', data: 'orderId' });

  it.each([
    ['1', 1],
    ['42', 42],
    [String(MAX_INT4), MAX_INT4],
  ])('accepts %s', (value, expected) => {
    expect(parse(value)).toBe(expected);
  });

  it.each([
    '0',
    '-1',
    '1.5',
    'abc',
    '',
    ' 1',
    '1e3',
    '0x10',
    String(MAX_INT4 + 1),
    '3000000000',
    '99999999999999999999999',
  ])('rejects %p with a 400 naming the param', (value) => {
    expect(() => parse(value)).toThrow(
      new BadRequestException(
        `orderId must be an integer between 1 and ${MAX_INT4}`,
      ),
    );
  });
});
