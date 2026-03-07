import { describe, expect, it } from 'vitest';
import { compose } from '../src/compose';
import type { OxlintConfig } from '../src/types';

describe('compose', () => {
  it('should return empty config when no configs provided', () => {
    expect(compose()).toEqual({});
  });

  it('should return the same config when one config provided', () => {
    const config: OxlintConfig = {
      plugins: ['eslint'],
      rules: { 'eslint/no-console': 'warn' },
    };
    const result = compose(config);
    expect(result.plugins).toEqual(['eslint']);
    expect(result.rules).toEqual({ 'eslint/no-console': 'warn' });
  });

  it('should merge plugins with dedup', () => {
    const a: OxlintConfig = { plugins: ['eslint', 'oxc'] };
    const b: OxlintConfig = { plugins: ['oxc', 'typescript'] };

    const result = compose(a, b);
    expect(result.plugins).toEqual(['eslint', 'oxc', 'typescript']);
  });

  it('should override rules from later configs', () => {
    const a: OxlintConfig = { rules: { 'eslint/no-console': 'error', 'eslint/eqeqeq': 'warn' } };
    const b: OxlintConfig = { rules: { 'eslint/no-console': 'off' } };

    const result = compose(a, b);
    expect(result.rules).toEqual({
      'eslint/no-console': 'off',
      'eslint/eqeqeq': 'warn',
    });
  });

  it('should override categories from later configs', () => {
    const a: OxlintConfig = { categories: { correctness: 'error', suspicious: 'warn' } };
    const b: OxlintConfig = { categories: { suspicious: 'off' } };

    const result = compose(a, b);
    expect(result.categories).toEqual({
      correctness: 'error',
      suspicious: 'off',
    });
  });

  it('should concatenate overrides', () => {
    const a: OxlintConfig = {
      overrides: [{ files: ['**/*.ts'], rules: { 'typescript/no-explicit-any': 'warn' } }],
    };
    const b: OxlintConfig = {
      overrides: [{ files: ['**/*.test.ts'], rules: { 'eslint/no-unused-vars': 'off' } }],
    };

    const result = compose(a, b);
    expect(result.overrides).toHaveLength(2);
    expect(result.overrides?.[0]?.files).toEqual(['**/*.ts']);
    expect(result.overrides?.[1]?.files).toEqual(['**/*.test.ts']);
  });

  it('should merge env', () => {
    const a: OxlintConfig = { env: { browser: true } };
    const b: OxlintConfig = { env: { node: true } };

    const result = compose(a, b);
    expect(result.env).toEqual({ browser: true, node: true });
  });

  it('should merge globals', () => {
    const a: OxlintConfig = { globals: { MY_VAR: 'readonly' } };
    const b: OxlintConfig = { globals: { ANOTHER: 'writable' } };

    const result = compose(a, b);
    expect(result.globals).toEqual({ MY_VAR: 'readonly', ANOTHER: 'writable' });
  });

  it('should deep merge settings', () => {
    const a: OxlintConfig = {
      settings: {
        react: { version: '18.2.0' },
        next: { rootDir: 'apps/' },
      },
    };
    const b: OxlintConfig = {
      settings: {
        react: { linkComponents: [{ name: 'Link', linkAttribute: 'to', attributes: ['to'] }] },
      },
    };

    const result = compose(a, b);
    expect(result.settings).toEqual({
      react: {
        version: '18.2.0',
        linkComponents: [{ name: 'Link', linkAttribute: 'to', attributes: ['to'] }],
      },
      next: { rootDir: 'apps/' },
    });
  });

  it('should concatenate ignorePatterns', () => {
    const a: OxlintConfig = { ignorePatterns: ['dist'] };
    const b: OxlintConfig = { ignorePatterns: ['node_modules', 'coverage'] };

    const result = compose(a, b);
    expect(result.ignorePatterns).toEqual(['dist', 'node_modules', 'coverage']);
  });

  it('should handle composing all presets together', () => {
    const base: OxlintConfig = {
      plugins: ['eslint', 'oxc'],
      categories: { correctness: 'error' },
      rules: { 'eslint/no-console': 'warn' },
    };
    const ts: OxlintConfig = {
      plugins: ['typescript'],
      overrides: [{ files: ['**/*.ts'], rules: { 'typescript/no-explicit-any': 'warn' } }],
    };
    const custom: OxlintConfig = {
      rules: { 'eslint/no-console': 'off' },
      ignorePatterns: ['dist'],
    };

    const result = compose(base, ts, custom);

    expect(result.plugins).toEqual(['eslint', 'oxc', 'typescript']);
    expect(result.categories).toEqual({ correctness: 'error' });
    expect(result.rules).toEqual({ 'eslint/no-console': 'off' });
    expect(result.overrides).toHaveLength(1);
    expect(result.ignorePatterns).toEqual(['dist']);
  });

  it('should skip undefined/empty fields', () => {
    const a: OxlintConfig = { plugins: ['eslint'] };
    const b: OxlintConfig = { rules: { 'eslint/no-console': 'warn' } };

    const result = compose(a, b);
    expect(result.plugins).toEqual(['eslint']);
    expect(result.rules).toEqual({ 'eslint/no-console': 'warn' });
    expect(result.overrides).toBeUndefined();
    expect(result.env).toBeUndefined();
    expect(result.settings).toBeUndefined();
  });

  it('should concatenate jsPlugins with dedup by specifier', () => {
    const a: OxlintConfig = { jsPlugins: ['eslint-plugin-foo'] };
    const b: OxlintConfig = { jsPlugins: ['eslint-plugin-foo', 'eslint-plugin-bar'] };

    const result = compose(a, b);
    expect(result.jsPlugins).toEqual(['eslint-plugin-foo', 'eslint-plugin-bar']);
  });

  it('should dedup jsPlugins with mixed string and object entries', () => {
    const a: OxlintConfig = { jsPlugins: ['eslint-plugin-foo'] };
    const b: OxlintConfig = { jsPlugins: [{ name: 'foo', specifier: 'eslint-plugin-foo' }] };

    const result = compose(a, b);
    expect(result.jsPlugins).toEqual(['eslint-plugin-foo']);
  });

  it('should keep jsPlugins and plugins independent', () => {
    const a: OxlintConfig = { plugins: ['eslint'], jsPlugins: ['eslint-plugin-foo'] };
    const b: OxlintConfig = { plugins: ['typescript'], jsPlugins: ['eslint-plugin-bar'] };

    const result = compose(a, b);
    expect(result.plugins).toEqual(['eslint', 'typescript']);
    expect(result.jsPlugins).toEqual(['eslint-plugin-foo', 'eslint-plugin-bar']);
  });
});
