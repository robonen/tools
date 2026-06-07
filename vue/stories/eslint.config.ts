import { base, compose, imports, stylistic, typescript } from '@robonen/eslint';

export default compose(base, typescript, imports, stylistic, {
  name: 'stories/overrides',
  files: ['**/*.vue', '**/*.stories.ts'],
  rules: {
    '@stylistic/no-multiple-empty-lines': 'off',
  },
});
