import { describe, expect, it } from 'vitest';
import { compose } from '../src/compose';
import type { FlatConfig } from '../src/types';

describe('compose', () => {
  it('should return empty array when no configs provided', () => {
    expect(compose()).toEqual([]);
  });

  it('should wrap a single flat config object into an array', () => {
    const config: FlatConfig = {
      name: 'a',
      rules: { 'no-console': 'warn' },
    };

    expect(compose(config)).toEqual([config]);
  });

  it('should flatten preset arrays into a single array', () => {
    const preset: FlatConfig[] = [
      { name: 'a', rules: { 'no-console': 'warn' } },
      { name: 'b', rules: { 'no-debugger': 'error' } },
    ];

    expect(compose(preset)).toEqual(preset);
  });

  it('should preserve order across presets and inline objects', () => {
    const presetA: FlatConfig[] = [{ name: 'a' }];
    const presetB: FlatConfig[] = [{ name: 'b' }, { name: 'c' }];
    const inline: FlatConfig = { name: 'd' };

    const result = compose(presetA, presetB, inline);

    expect(result.map(c => c.name)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('should not mutate the input arrays', () => {
    const preset: FlatConfig[] = [{ name: 'a' }];
    compose(preset, { name: 'b' });

    expect(preset).toEqual([{ name: 'a' }]);
  });

  it('should skip falsy entries for conditional composition', () => {
    const result = compose(
      { name: 'a' },
      false,
      null,
      undefined,
      { name: 'b' },
    );

    expect(result.map(c => c.name)).toEqual(['a', 'b']);
  });

  it('should compose all presets together preserving order', () => {
    const base: FlatConfig[] = [{ name: 'base/setup' }, { name: 'base/rules' }];
    const ts: FlatConfig[] = [{ name: 'ts' }];
    const custom: FlatConfig = { name: 'custom', rules: { 'no-console': 'off' } };

    const result = compose(base, ts, custom);

    expect(result.map(c => c.name)).toEqual(['base/setup', 'base/rules', 'ts', 'custom']);
    expect(result.at(-1)?.rules).toEqual({ 'no-console': 'off' });
  });
});
