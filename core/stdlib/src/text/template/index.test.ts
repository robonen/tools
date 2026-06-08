import { describe, expect, it } from 'vitest';
import { templateObject } from '.';

describe('templateObject', () => {
  it('replace an indexed array placeholder', () => {
    const template = 'Hello, {names.0}!';
    const args = { names: ['John'] };
    const result = templateObject(template, args);
    expect(result).toBe('Hello, John!');
  });

  it('replace a simple key placeholder', () => {
    const template = 'Hello, {name}!';
    const args = { name: 'John' };
    const result = templateObject(template, args);
    expect(result).toBe('Hello, John!');
  });

  it('replace template placeholders with fallback value if corresponding value is undefined', () => {
    const template = 'Hello, {name}!';
    const args = { age: 25 };
    const fallback = 'Guest';
    const result = templateObject(template, args, fallback);
    expect(result).toBe('Hello, Guest!');
  });

  it(' replace template placeholders with fallback value returned by fallback function if corresponding value is undefined', () => {
    const template = 'Hello, {name}!';
    const args = { age: 25 };
    const fallback = (key: string) => `Unknown ${key}`;
    const result = templateObject(template, args, fallback);
    expect(result).toBe('Hello, Unknown name!');
  });

  it('replace template placeholders with nested values from args', () => {
    const result = templateObject('Hello {{user.name}, your address {user.addresses.0.street}', {
      user: {
        name: 'John Doe',
        addresses: [
          { street: '123 Main St', city: 'Springfield' },
          { street: '456 Elm St', city: 'Shelbyville' },
        ],
      },
    });

    expect(result).toBe('Hello {John Doe, your address 123 Main St');
  });

  it('replace a missing placeholder with an empty string by default', () => {
    expect(templateObject('Hello, {name}!', {})).toBe('Hello, !');
  });

  it('render falsy-but-present values (0, false, empty string)', () => {
    expect(templateObject('count: {n}', { n: 0 })).toBe('count: 0');
    expect(templateObject('flag: {b}', { b: false })).toBe('flag: false');
    expect(templateObject('s:{s}.', { s: '' })).toBe('s:.');
  });

  it('trim whitespace inside the braces', () => {
    expect(templateObject('Hi { name }!', { name: 'Jo' })).toBe('Hi Jo!');
  });

  it('leave a template without placeholders untouched', () => {
    expect(templateObject('no placeholders here', {})).toBe('no placeholders here');
    expect(templateObject('', {})).toBe('');
  });
});
