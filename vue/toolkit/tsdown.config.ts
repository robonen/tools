import { defineConfig } from 'tsdown';
import { sharedConfig } from '@robonen/tsdown';

export default defineConfig({
  ...sharedConfig,
  entry: ['src/index.ts'],
  external: ['vue'],
  noExternal: [/^@robonen\//],
});
