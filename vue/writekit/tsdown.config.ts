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
    alwaysBundle: [/^@robonen\//, '@vue/shared'],
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
