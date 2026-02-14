import { defineConfig } from 'oxlint';
import { compose, base, typescript, imports } from '@robonen/oxlint';

export default defineConfig(compose(base, typescript, imports));
