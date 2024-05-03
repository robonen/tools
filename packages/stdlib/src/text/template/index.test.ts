import { describe, expect, it } from 'vitest';
import { templateObject } from './index';

describe('templateObject', () => {
  // it('replace template placeholders with corresponding values from args', () => {
  //   const template = 'Hello, {names.0}!';
  //   const args = { names: ['John'] };
  //   const result = templateObject(template, args);
  //   expect(result).toBe('Hello, John!');
  // });

  // it('replace template placeholders with corresponding values from args', () => {
  //   const template = 'Hello, {name}!';
  //   const args = { name: 'John' };
  //   const result = templateObject(template, args);
  //   expect(result).toBe('Hello, John!');
  // });

  // it('replace template placeholders with fallback value if corresponding value is undefined', () => {
  //   const template = 'Hello, {name}!';
  //   const args = { age: 25 };
  //   const fallback = 'Guest';
  //   const result = templateObject(template, args, fallback);
  //   expect(result).toBe('Hello, Guest!');
  // });

  // it(' replace template placeholders with fallback value returned by fallback function if corresponding value is undefined', () => {
  //   const template = 'Hello, {name}!';
  //   const args = { age: 25 };
  //   const fallback = (key: string) => `Unknown ${key}`;
  //   const result = templateObject(template, args, fallback);
  //   expect(result).toBe('Hello, Unknown name!');
  // });

  it('replace template placeholders with nested values from args', () => {
      const template = 'Hello, {user.name}!';
      const args = { user: { name: 'John' } };
      const result = templateObject(template, args);

      expect(result).toBe('Hello, John!');
  });
});