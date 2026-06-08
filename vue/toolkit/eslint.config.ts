import { base, compose, imports, stylistic, typescript, vitest, vue } from '@robonen/eslint';

export default compose(base, typescript, vue, vitest, imports, stylistic);
