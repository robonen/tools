import { defineConfig } from 'tsdown';
import { sharedConfig } from '@robonen/tsdown';

export default defineConfig({
  ...sharedConfig,
  tsconfig: './tsconfig.src.json',
  entry: ['src/index.ts'],
  external: ['vue'],
  noExternal: [/^@robonen\//],
});
