import { defineConfig } from 'tsdown';
import { sharedConfig } from '@robonen/tsdown';

export default defineConfig({
  ...sharedConfig,
  entry: ['src/index.ts'],
  deps: {
    neverBundle: ['vue'],
    alwaysBundle: [/^@robonen\//, '@vue/shared'],
  },
  inputOptions: {
    resolve: {
      alias: {
        // We need to alias @vue/shared to its ESM build to avoid issues
        // with tree-shaking and module resolution in Rolldown
        '@vue/shared': '@vue/shared/dist/shared.esm-bundler.js',
      },
    },
  },
  define: {
    __DEV__: 'false',
  },
});
