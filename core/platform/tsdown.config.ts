import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    browsers: 'src/browsers/index.ts',
    multi: 'src/multi/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  hash: false,
});