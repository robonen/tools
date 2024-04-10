import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'pathe';

export default defineConfig({
  build: {
    lib: {
      name: 'Stdlib',
      fileName: 'stdlib',
      entry: resolve(__dirname, './src/index.ts'),
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      exclude: '**/*.test.ts',
    }),
  ],
});
