import { base, compose, imports, stylistic, typescript } from '@robonen/oxlint';
import { defineConfig } from 'oxlint';

export default defineConfig(compose(base, typescript, imports, stylistic, {
  overrides: [
    {
      files: ['**/*.vue'],
      rules: {
        '@stylistic/no-multiple-empty-lines': 'off',
      },
    },
  ],
}));
