import type { OxlintConfig } from '../types';

/**
 * Vue.js-specific rules.
 *
 * Enforces Composition API with `<script setup>` and type-based declarations.
 */
export const vue: OxlintConfig = {
  plugins: ['vue'],

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
};
