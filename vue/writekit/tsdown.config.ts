import { defineConfig } from 'tsdown';
import { sharedConfig } from '@robonen/tsdown';
import Vue from 'unplugin-vue/rolldown';

export default defineConfig({
  ...sharedConfig,
  tsconfig: './tsconfig.src.json',
  entry: ['src/index.ts', 'src/*/index.ts'],
  plugins: [Vue({ isProduction: true })],
  dts: { vue: true },
  deps: {
    neverBundle: ['vue'],
    // `@robonen/*` (incl. `@robonen/primitives`) stay external — no more
    // inlining the whole component lib (and its transitive `@floating-ui/*`)
    // into writekit's bundle. Only stateless `@vue/shared` is inlined.
    alwaysBundle: ['@vue/shared'],
  },
  inputOptions: {
    resolve: {
      alias: {
        '@vue/shared': '@vue/shared/dist/shared.esm-bundler.js',
      },
    },
  },
  outputOptions: {
    ...sharedConfig.outputOptions,
    chunkFileNames: 'shared/[name]-[hash].js',
  },
  define: {
    __DEV__: 'false',
  },
});
