import { defineConfig } from 'tsdown';
import { sharedConfig } from '@robonen/tsdown';

export default defineConfig({
  ...sharedConfig,
  entry: {
    browsers: 'src/browsers/index.ts',
    multi: 'src/multi/index.ts',
  },
});
