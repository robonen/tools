import { defineConfig } from 'tsdown';
import { sharedConfig } from '@robonen/tsdown';

export default defineConfig({
  ...sharedConfig,
  tsconfig: './tsconfig.src.json',
  entry: {
    browsers: 'src/browsers/index.ts',
    multi: 'src/multi/index.ts',
  },
});
