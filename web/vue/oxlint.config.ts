import { defineConfig } from 'oxlint';
import { compose, base, typescript, vue, vitest, imports } from '@robonen/oxlint';

export default defineConfig(compose(base, typescript, vue, vitest, imports));
