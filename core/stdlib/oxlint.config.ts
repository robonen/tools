import { defineConfig } from 'oxlint';
import { compose, base, typescript, imports, stylistic } from '@robonen/oxlint';

export default defineConfig(compose(base, typescript, imports, stylistic));
