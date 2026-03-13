import { defineConfig } from 'oxlint';
import { base, compose, imports, stylistic, typescript } from '@robonen/oxlint';

export default defineConfig(compose(base, typescript, imports, stylistic));
