import { base, compose, imports, stylistic, typescript } from '@robonen/eslint';

export default compose(base, typescript, imports, stylistic, {
  name: 'platform/overrides',
  files: ['src/multi/global/index.ts'],
  rules: {
    'unicorn/prefer-global-this': 'off',
  },
});
