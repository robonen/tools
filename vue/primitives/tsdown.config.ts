import { defineConfig } from 'tsdown';
import { sharedConfig } from '@robonen/tsdown';
import Vue from 'unplugin-vue/rolldown';

export default defineConfig({
  ...sharedConfig,
  tsconfig: './tsconfig.src.json',
  // Components live one level deep now: src/<category>/<component>/index.ts.
  entry: ['src/index.ts', 'src/*/*/index.ts'],
  // `comments: false` is load-bearing: a template comment next to a single
  // root node compiles into a Fragment root, and production Vue never applies
  // fallthrough attrs to fragments (dev filters comments out, prod does not) —
  // consumers' `class` silently vanished from SelectTrigger/ComboboxAnchor.
  plugins: [Vue({ isProduction: true, template: { compilerOptions: { comments: false } } })],
  dts: { vue: true },
  deps: {
    neverBundle: ['vue'],
    // `@robonen/*` stay external (deduped by the package manager); only the
    // stateless `@vue/shared` helpers are inlined (a Vue internal consumers
    // don't install directly, so it can't be externalized reliably).
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
