import { describe, expect, it } from 'vitest';
import { isBigInt, isBoolean, isFunction, isNull, isNumber, isString, isSymbol, isUndefined } from './primitives';

describe('primitives', () => {
  describe('isBoolean', () => {
    it('true if the value is a boolean', () => {
      expect(isBoolean(true)).toBe(true);
      expect(isBoolean(false)).toBe(true);
    });

    it('false if the value is not a boolean', () => {
      expect(isBoolean(0)).toBe(false);
      expect(isBoolean('true')).toBe(false);
      expect(isBoolean(null)).toBe(false);
    });
  });

  describe('isFunction', () => {
    it('true if the value is a function', () => {
      expect(isFunction(() => {})).toBe(true);
      expect(isFunction(function () {})).toBe(true);
    });

    it('false if the value is not a function', () => {
      expect(isFunction(123)).toBe(false);
      expect(isFunction('function')).toBe(false);
      expect(isFunction(null)).toBe(false);
    });
  });

  describe('isNumber', () => {
    it('true if the value is a number', () => {
      expect(isNumber(123)).toBe(true);
      expect(isNumber(3.14)).toBe(true);
    });

    it('false if the value is not a number', () => {
      expect(isNumber('123')).toBe(false);
      expect(isNumber(null)).toBe(false);
    });

    it('true for NaN, Infinity and -0 (purely typeof-based)', () => {
      expect(isNumber(Number.NaN)).toBe(true);
      expect(isNumber(Number.POSITIVE_INFINITY)).toBe(true);
      expect(isNumber(Number.NEGATIVE_INFINITY)).toBe(true);
      expect(isNumber(-0)).toBe(true);
    });
  });

  describe('isBigInt', () => {
    it('true if the value is a bigint', () => {
      expect(isBigInt(BigInt(123))).toBe(true);
    });

    it('false if the value is not a bigint', () => {
      expect(isBigInt(123)).toBe(false);
      expect(isBigInt('123')).toBe(false);
      expect(isBigInt(null)).toBe(false);
    });
  });

  describe('isString', () => {
    it('true if the value is a string', () => {
      expect(isString('hello')).toBe(true);
    });

    it('false if the value is not a string', () => {
      expect(isString(123)).toBe(false);
      expect(isString(null)).toBe(false);
    });
  });

  describe('isSymbol', () => {
    it('true if the value is a symbol', () => {
      expect(isSymbol(Symbol('test'))).toBe(true);
    });

    it('false if the value is not a symbol', () => {
      expect(isSymbol(123)).toBe(false);
      expect(isSymbol('symbol')).toBe(false);
      expect(isSymbol(null)).toBe(false);
    });
  });

  describe('isUndefined', () => {
    it('true if the value is undefined', () => {
      expect(isUndefined(undefined)).toBe(true);
    });

    it('false if the value is not undefined', () => {
      expect(isUndefined(null)).toBe(false);
      expect(isUndefined(123)).toBe(false);
      expect(isUndefined('undefined')).toBe(false);
    });
  });

  describe('isNull', () => {
    it('true if the value is null', () => {
      expect(isNull(null)).toBe(true);
    });

    it('false if the value is not null', () => {
      expect(isNull(undefined)).toBe(false);
      expect(isNull(123)).toBe(false);
      expect(isNull('null')).toBe(false);
    });
  });
});
