import { defineConfig } from 'oxlint';
import { compose, base, imports, stylistic, typescript, vue } from '@robonen/oxlint';

export default defineConfig(compose(base, typescript, imports, vue, stylistic));
