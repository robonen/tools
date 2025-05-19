import { describe, expect, it } from 'vitest';
import { isArray, isObject, isRegExp, isDate, isError, isPromise, isMap, isSet, isWeakMap, isWeakSet } from './complex';

describe('complex', () => {
  describe('isArray', () => {
    it('true if the value is an array', () => {
      expect(isArray([])).toBe(true);
      expect(isArray([1, 2, 3])).toBe(true);
    });
  
    it('false if the value is not an array', () => {
      expect(isArray('')).toBe(false);
      expect(isArray(123)).toBe(false);
      expect(isArray(true)).toBe(false);
      expect(isArray(null)).toBe(false);
      expect(isArray(undefined)).toBe(false);
      expect(isArray({})).toBe(false);
      expect(isArray(new Map())).toBe(false);
      expect(isArray(new Set())).toBe(false);
    });
  });
  
  describe('isObject', () => {
    it('true if the value is an object', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ key: 'value' })).toBe(true);
    });
  
    it('false if the value is not an object', () => {
      expect(isObject('')).toBe(false);
      expect(isObject(123)).toBe(false);
      expect(isObject(true)).toBe(false);
      expect(isObject(null)).toBe(false);
      expect(isObject(undefined)).toBe(false);
      expect(isObject([])).toBe(false);
      expect(isObject(new Map())).toBe(false);
      expect(isObject(new Set())).toBe(false);
    });
  });
  
  describe('isRegExp', () => {
    it('true if the value is a regexp', () => {
      expect(isRegExp(/test/)).toBe(true);
      expect(isRegExp(new RegExp('test'))).toBe(true);
    });
  
    it('false if the value is not a regexp', () => {
      expect(isRegExp('')).toBe(false);
      expect(isRegExp(123)).toBe(false);
      expect(isRegExp(true)).toBe(false);
      expect(isRegExp(null)).toBe(false);
      expect(isRegExp(undefined)).toBe(false);
      expect(isRegExp([])).toBe(false);
      expect(isRegExp({})).toBe(false);
      expect(isRegExp(new Map())).toBe(false);
      expect(isRegExp(new Set())).toBe(false);
    });
  });
  
  describe('isDate', () => {
    it('true if the value is a date', () => {
      expect(isDate(new Date())).toBe(true);
    });
  
    it('false if the value is not a date', () => {
      expect(isDate('')).toBe(false);
      expect(isDate(123)).toBe(false);
      expect(isDate(true)).toBe(false);
      expect(isDate(null)).toBe(false);
      expect(isDate(undefined)).toBe(false);
      expect(isDate([])).toBe(false);
      expect(isDate({})).toBe(false);
      expect(isDate(new Map())).toBe(false);
      expect(isDate(new Set())).toBe(false);
    });
  });
  
  describe('isError', () => {
    it('true if the value is an error', () => {
      expect(isError(new Error())).toBe(true);
    });
  
    it('false if the value is not an error', () => {
      expect(isError('')).toBe(false);
      expect(isError(123)).toBe(false);
      expect(isError(true)).toBe(false);
      expect(isError(null)).toBe(false);
      expect(isError(undefined)).toBe(false);
      expect(isError([])).toBe(false);
      expect(isError({})).toBe(false);
      expect(isError(new Map())).toBe(false);
      expect(isError(new Set())).toBe(false);
    });
  });
  
  describe('isPromise', () => {
    it('true if the value is a promise', () => {
      expect(isPromise(new Promise(() => {}))).toBe(true);
    });
  
    it('false if the value is not a promise', () => {
      expect(isPromise('')).toBe(false);
      expect(isPromise(123)).toBe(false);
      expect(isPromise(true)).toBe(false);
      expect(isPromise(null)).toBe(false);
      expect(isPromise(undefined)).toBe(false);
      expect(isPromise([])).toBe(false);
      expect(isPromise({})).toBe(false);
      expect(isPromise(new Map())).toBe(false);
      expect(isPromise(new Set())).toBe(false);
    });
  });
  
  describe('isMap', () => {
    it('true if the value is a map', () => {
      expect(isMap(new Map())).toBe(true);
    });
  
    it('false if the value is not a map', () => {
      expect(isMap('')).toBe(false);
      expect(isMap(123)).toBe(false);
      expect(isMap(true)).toBe(false);
      expect(isMap(null)).toBe(false);
      expect(isMap(undefined)).toBe(false);
      expect(isMap([])).toBe(false);
      expect(isMap({})).toBe(false);
      expect(isMap(new Set())).toBe(false);
    });
  });
  
  describe('isSet', () => {
    it('true if the value is a set', () => {
      expect(isSet(new Set())).toBe(true);
    });
  
    it('false if the value is not a set', () => {
      expect(isSet('')).toBe(false);
      expect(isSet(123)).toBe(false);
      expect(isSet(true)).toBe(false);
      expect(isSet(null)).toBe(false);
      expect(isSet(undefined)).toBe(false);
      expect(isSet([])).toBe(false);
      expect(isSet({})).toBe(false);
      expect(isSet(new Map())).toBe(false);
    });
  });
  
  describe('isWeakMap', () => {
    it('true if the value is a weakmap', () => {
      expect(isWeakMap(new WeakMap())).toBe(true);
    });
  
    it('false if the value is not a weakmap', () => {
      expect(isWeakMap('')).toBe(false);
      expect(isWeakMap(123)).toBe(false);
      expect(isWeakMap(true)).toBe(false);
      expect(isWeakMap(null)).toBe(false);
      expect(isWeakMap(undefined)).toBe(false);
      expect(isWeakMap([])).toBe(false);
      expect(isWeakMap({})).toBe(false);
      expect(isWeakMap(new Map())).toBe(false);
      expect(isWeakMap(new Set())).toBe(false);
    });
  });
  
  describe('isWeakSet', () => {
    it('true if the value is a weakset', () => {
      expect(isWeakSet(new WeakSet())).toBe(true);
    });
  
    it('false if the value is not a weakset', () => {
      expect(isWeakSet('')).toBe(false);
      expect(isWeakSet(123)).toBe(false);
      expect(isWeakSet(true)).toBe(false);
      expect(isWeakSet(null)).toBe(false);
      expect(isWeakSet(undefined)).toBe(false);
      expect(isWeakSet([])).toBe(false);
      expect(isWeakSet({})).toBe(false);
      expect(isWeakSet(new Map())).toBe(false);
      expect(isWeakSet(new Set())).toBe(false);
    });
  });
});