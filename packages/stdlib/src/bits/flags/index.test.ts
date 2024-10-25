import { describe, it, expect } from 'vitest';
import { flagsGenerator } from '.';

describe('flagsGenerator', () => {
  it('generate unique flags', () => {
    const generateFlag = flagsGenerator();

    const flag1 = generateFlag();
    const flag2 = generateFlag();
    const flag3 = generateFlag();

    expect(flag1).toBe(1);
    expect(flag2).toBe(2);
    expect(flag3).toBe(4);
  });

  it('throw an error if more than 31 flags are created', () => {
    const generateFlag = flagsGenerator();

    for (let i = 0; i < 31; i++) {
      generateFlag();
    }

    expect(() => generateFlag()).toThrow(new RangeError('Cannot create more than 31 flags'));
  });
});
