import { describe, expect, it } from 'vitest';
import { and, has, is, not, or, toggle, unset } from '.';

describe('flagsAnd', () => {
  it('no effect on zero flags', () => {
    const result = and();

    expect(result).toBe(-1);
  });

  it('source flag is returned if no flags are provided', () => {
    const result = and(0b1010);

    expect(result).toBe(0b1010);
  });

  it('perform bitwise AND operation on flags', () => {
    const result = and(0b1111, 0b1010, 0b1100);

    expect(result).toBe(0b1000);
  });
});

describe('flagsOr', () => {
  it('no effect on zero flags', () => {
    const result = or();

    expect(result).toBe(0);
  });

  it('source flag is returned if no flags are provided', () => {
    const result = or(0b1010);

    expect(result).toBe(0b1010);
  });

  it('perform bitwise OR operation on flags', () => {
    const result = or(0b1111, 0b1010, 0b1100);

    expect(result).toBe(0b1111);
  });
});

describe('flagsNot', () => {
  it('perform bitwise NOT operation on a flag', () => {
    const result = not(0b101);

    expect(result).toBe(-0b110);
  });
});

describe('flagsHas', () => {
  it('check if a flag has a specific bit set', () => {
    const result = has(0b1010, 0b1000);

    expect(result).toBe(true);
  });

  it('check if a flag has a specific bit unset', () => {
    const result = has(0b1010, 0b0100);

    expect(result).toBe(false);
  });

  it('require ALL queried bits, not just any (partial overlap is false)', () => {
    // 0b1000 is set but 0b0100 is not — partial overlap must be false
    expect(has(0b1010, 0b1100)).toBe(false);
    // both bits present
    expect(has(0b1110, 0b1100)).toBe(true);
    // querying zero bits is vacuously true
    expect(has(0b1010, 0b0000)).toBe(true);
  });
});

describe('flagsIs', () => {
  it('check if a flag is set', () => {
    const result = is(0b1010);

    expect(result).toBe(true);
  });

  it('check if a flag is unset', () => {
    const result = is(0);

    expect(result).toBe(false);
  });
});

describe('flagsUnset', () => {
  it('unset a flag', () => {
    const result = unset(0b1010, 0b1000);

    expect(result).toBe(0b0010);
  });
});

describe('flagsToggle', () => {
  it('toggle a flag', () => {
    const result = toggle(0b1010, 0b1000);

    expect(result).toBe(0b0010);
  });
});
