import { describe, expect, it } from 'vitest';
import { isEventTarget } from './index';

describe('isEventTarget', () => {
  it('is true for objects exposing addEventListener', () => {
    expect(isEventTarget(globalThis)).toBe(true);
    expect(isEventTarget(document)).toBe(true);
    expect(isEventTarget(document.createElement('div'))).toBe(true);
  });

  it('is false for non-targets', () => {
    expect(isEventTarget(null)).toBe(false);
    expect(isEventTarget(undefined)).toBe(false);
    expect(isEventTarget({})).toBe(false);
    expect(isEventTarget('window')).toBe(false);
    expect(isEventTarget(42)).toBe(false);
    expect(isEventTarget(() => {})).toBe(false);
  });
});
