import { base, compose, imports, stylistic, tests, typescript, vue } from '@robonen/eslint';

export default compose(base, typescript, vue, imports, stylistic, {
  name: 'docs/build-scripts',
  files: ['modules/**'],
  rules: {
    /* Build-time tooling (doc extractor) logs progress to the console. */
    'no-console': 'off',
  },
}, tests);
