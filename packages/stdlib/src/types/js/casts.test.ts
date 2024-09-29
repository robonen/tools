import { describe, it, expect } from 'vitest';
import { toString } from './casts';

describe('casts', () => {
  describe('toString', () => {
    it('correct string representation of a value', () => {
      // Primitives
      expect(toString(true)).toBe('[object Boolean]');
      expect(toString(() => {})).toBe('[object Function]');
      expect(toString(5)).toBe('[object Number]');
      expect(toString(BigInt(5))).toBe('[object BigInt]');
      expect(toString('hello')).toBe('[object String]');
      expect(toString(Symbol('foo'))).toBe('[object Symbol]');

      // Complex
      expect(toString([])).toBe('[object Array]');
      expect(toString({})).toBe('[object Object]');
      expect(toString(undefined)).toBe('[object Undefined]');
      expect(toString(null)).toBe('[object Null]');
      expect(toString(/abc/)).toBe('[object RegExp]');
      expect(toString(new Date())).toBe('[object Date]');
      expect(toString(new Error())).toBe('[object Error]');
      expect(toString(new Promise(() => {}))).toBe('[object Promise]');
      expect(toString(new Map())).toBe('[object Map]');
      expect(toString(new Set())).toBe('[object Set]');
      expect(toString(new WeakMap())).toBe('[object WeakMap]');
      expect(toString(new WeakSet())).toBe('[object WeakSet]');
    });
  });
});