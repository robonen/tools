import { base, compose, imports, stylistic, typescript, vue } from '@robonen/eslint';

export default compose(base, typescript, vue, imports, stylistic, {
  name: 'primitives/overrides',
  files: ['**/*.vue'],
  rules: {
    '@stylistic/no-multiple-empty-lines': 'off',
  },
});
