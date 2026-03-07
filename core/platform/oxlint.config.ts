import { defineConfig } from 'oxlint';
import { compose, base, typescript, imports, stylistic } from '@robonen/oxlint';

export default defineConfig(
  compose(base, typescript, imports, stylistic, {
    overrides: [
      {
        files: ['src/multi/global/index.ts'],
        rules: {
          'unicorn/prefer-global-this': 'off',
        },
      },
    ],
  }),
);
