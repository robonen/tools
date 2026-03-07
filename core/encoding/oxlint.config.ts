import { defineConfig } from 'oxlint';
import { compose, base, typescript, imports, stylistic } from '@robonen/oxlint';

export default defineConfig(compose(base, typescript, imports, stylistic, {
  overrides: [
    {
      files: ['src/qr/qr-code.ts'],
      rules: {
        '@stylistic/max-statements-per-line': 'off',
        '@stylistic/no-mixed-operators': 'off',
      },
    },
  ],
}));
