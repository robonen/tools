import type { FlatConfigArray } from '../types';
import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';
import vueParser from 'vue-eslint-parser';

/**
 * Vue.js configuration.
 *
 * Registers `eslint-plugin-vue` with `vue-eslint-parser` (delegating
 * `<script lang="ts">` to the TypeScript parser) and enables an opinionated
 * subset that enforces Composition API with `<script setup>` and type-based
 * declarations. Only the listed rules are turned on — the plugin's large
 * `recommended` set is intentionally not pulled in.
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
      'vue/no-arrow-functions-in-watch': 'error',
      'vue/no-deprecated-destroyed-lifecycle': 'error',
      'vue/no-export-in-script-setup': 'error',
      'vue/no-lifecycle-after-await': 'error',
      'vue/no-multiple-slot-args': 'error',
      'vue/no-import-compiler-macros': 'error',
      'vue/define-emits-declaration': ['error', 'type-based'],
      'vue/define-props-declaration': ['error', 'type-based'],
      'vue/prefer-import-from-vue': 'error',
      'vue/no-required-prop-with-default': 'warn',
      'vue/valid-define-emits': 'error',
      'vue/valid-define-props': 'error',
      'vue/require-typed-ref': 'warn',
    },
  },
];
