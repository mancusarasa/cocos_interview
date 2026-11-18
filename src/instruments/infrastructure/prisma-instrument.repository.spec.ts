import { escapeLike } from './prisma-instrument.repository';

describe('escapeLike', () => {
  it('escapes LIKE wildcards and the escape character', () => {
    expect(escapeLike('100%')).toBe('100\\%');
    expect(escapeLike('a_b')).toBe('a\\_b');
    expect(escapeLike('a\\b')).toBe('a\\\\b');
  });

  it('leaves ordinary terms untouched', () => {
    expect(escapeLike('Banco S.A.')).toBe('Banco S.A.');
  });
});
