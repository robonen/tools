import { describe, expect, it } from 'vitest';
import {
  decodeCookieValue,
  encodeCookieName,
  encodeCookieValue,
  getCookieValue,
  parseCookieString,
  serializeCookie,
} from './index';

describe('encodeCookieValue', () => {
  it('passes plain values through unchanged', () => {
    expect(encodeCookieValue('dark')).toBe('dark');
    expect(encodeCookieValue('abc-123_~.!*')).toBe('abc-123_~.!*');
  });

  it('keeps RFC 6265-allowed punctuation readable', () => {
    expect(encodeCookieValue('a=b&c:d/e?f@g')).toBe('a=b&c:d/e?f@g');
    expect(encodeCookieValue('#$+<>[]^`{|}')).toBe('#$+<>[]^`{|}');
  });

  it('encodes characters cookies cannot contain', () => {
    expect(encodeCookieValue('a;b')).toBe('a%3Bb');
    expect(encodeCookieValue('a b')).toBe('a%20b');
    expect(encodeCookieValue('a,b')).toBe('a%2Cb');
    expect(encodeCookieValue('a"b')).toBe('a%22b');
    expect(encodeCookieValue('a\\b')).toBe('a%5Cb');
    expect(encodeCookieValue('50%')).toBe('50%25');
  });

  it('round-trips through decodeCookieValue', () => {
    const value = 'json:{"a": "b, c"}; 50% off\\done';

    expect(decodeCookieValue(encodeCookieValue(value))).toBe(value);
  });
});

describe('decodeCookieValue', () => {
  it('decodes percent escapes', () => {
    expect(decodeCookieValue('a%3Bb')).toBe('a;b');
    expect(decodeCookieValue('%D0%BF%D1%80%D0%B8%D0%B2%D0%B5%D1%82')).toBe('привет');
  });

  it('returns malformed escapes as-is instead of throwing', () => {
    expect(decodeCookieValue('100%')).toBe('100%');
    expect(decodeCookieValue('%E0%A4%A')).toBe('%E0%A4%A');
  });

  it('unwraps DQUOTE-wrapped values', () => {
    expect(decodeCookieValue('"dark"')).toBe('dark');
    expect(decodeCookieValue('"a%3Bb"')).toBe('a;b');
    expect(decodeCookieValue('"')).toBe('"');
  });
});

describe('encodeCookieName', () => {
  it('passes typical names through unchanged', () => {
    expect(encodeCookieName('session-id')).toBe('session-id');
    expect(encodeCookieName('user_pref.v2')).toBe('user_pref.v2');
  });

  it('encodes separators and whitespace', () => {
    expect(encodeCookieName('user name')).toBe('user%20name');
    expect(encodeCookieName('a=b')).toBe('a%3Db');
    expect(encodeCookieName('a;b')).toBe('a%3Bb');
  });

  it('escapes parentheses', () => {
    expect(encodeCookieName('a(b)')).toBe('a%28b%29');
  });
});

describe('parseCookieString', () => {
  it('parses an empty string to an empty map', () => {
    expect(parseCookieString('').size).toBe(0);
  });

  it('parses multiple cookies', () => {
    const map = parseCookieString('theme=dark; sid=abc123');

    expect(map.get('theme')).toBe('dark');
    expect(map.get('sid')).toBe('abc123');
  });

  it('decodes names and values by default', () => {
    const map = parseCookieString('user%20name=a%3Bb');

    expect(map.get('user name')).toBe('a;b');
  });

  it('keeps raw values with an identity decoder', () => {
    const map = parseCookieString('sid=a%3Bb', value => value);

    expect(map.get('sid')).toBe('a%3Bb');
  });

  it('keeps the first occurrence per name (most specific path wins)', () => {
    const map = parseCookieString('dup=specific; dup=generic');

    expect(map.get('dup')).toBe('specific');
  });

  it('keeps the value intact when it contains "="', () => {
    const map = parseCookieString('token=a=b=c');

    expect(map.get('token')).toBe('a=b=c');
  });

  it('unwraps double-quoted values via the default decoder, keeps them raw with identity', () => {
    expect(parseCookieString('quoted="hello"').get('quoted')).toBe('hello');
    // The raw layer is verbatim — matching what the Cookie Store API reports
    expect(parseCookieString('quoted="hello"', value => value).get('quoted')).toBe('"hello"');
  });

  it('parses nameless cookies under the empty name', () => {
    expect(parseCookieString('=bare').get('')).toBe('bare');
    expect(parseCookieString('bare').get('')).toBe('bare');
  });
});

describe('getCookieValue', () => {
  it('finds a cookie by name', () => {
    expect(getCookieValue('theme=dark; sid=abc', 'sid')).toBe('abc');
    expect(getCookieValue('theme=dark; sid=abc', 'theme')).toBe('dark');
  });

  it('returns null for a missing cookie or empty string', () => {
    expect(getCookieValue('theme=dark', 'missing')).toBeNull();
    expect(getCookieValue('', 'any')).toBeNull();
  });

  it('decodes the value by default and supports an identity decoder', () => {
    expect(getCookieValue('sid=a%3Bb', 'sid')).toBe('a;b');
    expect(getCookieValue('sid=a%3Bb', 'sid', value => value)).toBe('a%3Bb');
  });

  it('matches encoded stored names against the raw name', () => {
    expect(getCookieValue('user%20name=v', 'user name')).toBe('v');
  });

  it('keeps the first occurrence and unwraps quotes via the default decoder', () => {
    expect(getCookieValue('dup=specific; dup=generic', 'dup')).toBe('specific');
    expect(getCookieValue('quoted="hello"', 'quoted')).toBe('hello');
    expect(getCookieValue('quoted="hello"', 'quoted', value => value)).toBe('"hello"');
  });

  it('matches parseCookieString semantics for edge cases', () => {
    for (const cookie of ['token=a=b=c', '=bare', 'bare', 'a=1; ; b=2']) {
      const map = parseCookieString(cookie);

      for (const [name, value] of map)
        expect(getCookieValue(cookie, name)).toBe(value);
    }
  });
});

describe('serializeCookie', () => {
  it('always emits Path and SameSite', () => {
    expect(serializeCookie('theme', 'dark')).toBe('theme=dark; Path=/; SameSite=Lax');
  });

  it('emits the provided attributes', () => {
    expect(serializeCookie('sid', 'abc', {
      path: '/app',
      domain: 'example.com',
      maxAge: 3600,
      secure: true,
      sameSite: 'strict',
    })).toBe('sid=abc; Path=/app; Domain=example.com; SameSite=Strict; Max-Age=3600; Secure');
  });

  it('serializes expires from a Date and from epoch milliseconds', () => {
    const date = new Date('2030-01-01T00:00:00Z');

    expect(serializeCookie('a', 'b', { expires: date })).toContain(`Expires=${date.toUTCString()}`);
    expect(serializeCookie('a', 'b', { expires: date.getTime() })).toContain(`Expires=${date.toUTCString()}`);
  });

  it('emits Partitioned together with Secure', () => {
    expect(serializeCookie('a', 'b', { secure: true, partitioned: true })).toContain('; Secure; Partitioned');
  });

  it('expresses deletion as a non-positive Max-Age', () => {
    expect(serializeCookie('a', '', { maxAge: 0 })).toBe('a=; Path=/; SameSite=Lax; Max-Age=0');
  });

  it('throws on a non-encoded name', () => {
    expect(() => serializeCookie('a b', 'v')).toThrow(TypeError);
    expect(() => serializeCookie('a=b', 'v')).toThrow(TypeError);
    expect(() => serializeCookie('a;b', 'v')).toThrow(TypeError);
  });

  it('throws on a non-encoded value (attribute injection)', () => {
    expect(() => serializeCookie('a', 'v; Path=/admin')).toThrow(TypeError);
    expect(() => serializeCookie('a', 'v w')).toThrow(TypeError);
    expect(() => serializeCookie('a', 'a,b')).toThrow(TypeError);
    expect(serializeCookie('a', '"quoted"')).toContain('a="quoted"');
  });

  it('throws on SameSite=None without Secure', () => {
    expect(() => serializeCookie('a', 'b', { sameSite: 'none' })).toThrow(TypeError);
    expect(serializeCookie('a', 'b', { sameSite: 'none', secure: true })).toContain('SameSite=None');
  });

  it('throws on Partitioned without Secure', () => {
    expect(() => serializeCookie('a', 'b', { partitioned: true })).toThrow(TypeError);
  });

  it('throws when name plus value exceeds 4096 bytes (the "=" is not counted)', () => {
    expect(() => serializeCookie('big', 'x'.repeat(4094))).toThrow(RangeError);
    expect(serializeCookie('big', 'x'.repeat(4093))).toContain('big=');
  });
});
