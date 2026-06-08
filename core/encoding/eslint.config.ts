import { base, compose, imports, stylistic, typescript } from '@robonen/eslint';

export default compose(base, typescript, imports, stylistic, {
  name: 'encoding/overrides',
  files: ['src/qr/qr-code.ts'],
  rules: {
    '@stylistic/max-statements-per-line': 'off',
    '@stylistic/no-mixed-operators': 'off',
    /* Uniform sliding-window register shift (h6 = h5; h5 = h4; …) where the
       oldest register's seed/last write is intentionally dead — keep symmetry. */
    'no-useless-assignment': 'off',
  },
});
