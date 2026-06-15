import { base, compose, imports, stylistic, tests, typescript, vitest, vue } from '@robonen/eslint';

export default compose(base, typescript, vue, vitest, imports, stylistic, tests);
