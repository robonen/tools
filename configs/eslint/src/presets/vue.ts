import type { FlatConfigArray, Rules } from '../types';
import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';
import vueParser from 'vue-eslint-parser';

/**
 * Merge the rule maps from every config object in an eslint-plugin-vue flat
 * preset (they ship as arrays) into a single rules record.
 */
function collectRules(configs: Array<{ rules?: unknown }>): Rules {
  return configs.reduce<Rules>((rules, config) => ({ ...rules, ...(config.rules as Rules | undefined) }), {});
}

/**
 * The Priority-A "Essential" (error-prevention) ruleset from eslint-plugin-vue.
 */
const essentialRules = collectRules(pluginVue.configs['flat/essential'] as Array<{ rules?: unknown }>);

/**
 * Vue.js configuration.
 *
 * Registers `eslint-plugin-vue` with `vue-eslint-parser` (delegating
 * `<script lang="ts">` to the TypeScript parser), adopts the plugin's full
 * **Essential** (Priority-A) ruleset, and layers opinionated rules that enforce
 * the Composition API with `<script setup>` and type-based declarations.
 */
export const vue: FlatConfigArray = [
  {
    name: 'robonen/vue/setup',
    files: ['**/*.vue'],
    plugins: {
      vue: pluginVue,
    },
    processor: pluginVue.processors['.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        ecmaFeatures: { jsx: true },
        extraFileExtensions: ['.vue'],
        sourceType: 'module',
      },
    },
  },
  {
    name: 'robonen/vue/rules',
    files: ['**/*.vue'],
    rules: {
      ...essentialRules,

      /* Component library: single-word component names (Primitive, Slot, …) are intentional. */
      'vue/multi-word-component-names': 'off',

      /* House additions / stricter opinions on top of Essential. */
      'vue/no-multiple-slot-args': 'error',
      'vue/no-import-compiler-macros': 'error',
      'vue/define-emits-declaration': ['error', 'type-based'],
      'vue/define-props-declaration': ['error', 'type-based'],
      'vue/prefer-import-from-vue': 'error',
      'vue/no-required-prop-with-default': 'error',
      'vue/require-typed-ref': 'error',
    },
  },
];
