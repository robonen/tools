import type { OxlintConfig } from './types';

/**
 * Deep merge two objects. Arrays are concatenated, objects are recursively merged.
 */
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    const targetValue = target[key];
    const sourceValue = source[key];

    if (
      typeof targetValue === 'object' && targetValue !== null && !Array.isArray(targetValue)
      && typeof sourceValue === 'object' && sourceValue !== null && !Array.isArray(sourceValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>,
      );
    }
    else {
      result[key] = sourceValue;
    }
  }

  return result;
}

/**
 * Compose multiple oxlint configurations into a single config.
 *
 * - `plugins` — union (deduplicated)
 * - `jsPlugins` — union (deduplicated by specifier)
 * - `categories` — later configs override earlier
 * - `rules` — later configs override earlier
 * - `overrides` — concatenated
 * - `env` — merged (later overrides earlier)
 * - `globals` — merged (later overrides earlier)
 * - `settings` — deep-merged
 * - `ignorePatterns` — concatenated
 *
 * @example
 * ```ts
 * import { compose, base, typescript, vue } from '@robonen/oxlint';
 * import { defineConfig } from 'oxlint';
 *
 * export default defineConfig(
 *   compose(base, typescript, vue, {
 *     rules: { 'eslint/no-console': 'off' },
 *   }),
 * );
 * ```
 */
export function compose(...configs: OxlintConfig[]): OxlintConfig {
  const result: OxlintConfig = {};

  for (const config of configs) {
    // Plugins — union with dedup
    if (config.plugins?.length) {
      result.plugins = Array.from(new Set([...(result.plugins ?? []), ...config.plugins]));
    }

    // JS Plugins — union with dedup by specifier
    if (config.jsPlugins?.length) {
      const existing = result.jsPlugins ?? [];
      const seen = new Set(existing.map(e => typeof e === 'string' ? e : e.specifier));

      for (const entry of config.jsPlugins) {
        const specifier = typeof entry === 'string' ? entry : entry.specifier;
        if (!seen.has(specifier)) {
          seen.add(specifier);
          existing.push(entry);
        }
      }

      result.jsPlugins = existing;
    }

    // Categories — shallow merge
    if (config.categories) {
      result.categories = { ...result.categories, ...config.categories };
    }

    // Rules — shallow merge (later overrides earlier)
    if (config.rules) {
      result.rules = { ...result.rules, ...config.rules };
    }

    // Overrides — concatenate
    if (config.overrides?.length) {
      result.overrides = [...(result.overrides ?? []), ...config.overrides];
    }

    // Env — shallow merge
    if (config.env) {
      result.env = { ...result.env, ...config.env };
    }

    // Globals — shallow merge
    if (config.globals) {
      result.globals = { ...result.globals, ...config.globals };
    }

    // Settings — deep merge
    if (config.settings) {
      result.settings = deepMerge(
        (result.settings ?? {}) as Record<string, unknown>,
        config.settings as Record<string, unknown>,
      );
    }

    // Ignore patterns — concatenate
    if (config.ignorePatterns?.length) {
      result.ignorePatterns = [...(result.ignorePatterns ?? []), ...config.ignorePatterns];
    }
  }

  return result;
}
