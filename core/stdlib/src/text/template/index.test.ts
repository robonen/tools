import { describe, expect, it } from 'vitest';
import { templateObject } from '.';

describe.skip('templateObject', () => {
  it('replace template placeholders with corresponding values from args', () => {
    const template = 'Hello, {names.0}!';
    const args = { names: ['John'] };
    const result = templateObject(template, args);
    expect(result).toBe('Hello, John!');
  });

  it('replace template placeholders with corresponding values from args', () => {
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
           { street: '123 Main St', city: 'Springfield'},
           { street: '456 Elm St', city: 'Shelbyville'}
         ]
       }
     });

      expect(result).toBe('Hello {John Doe, your address 123 Main St');
  });
});