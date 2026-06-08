import { URL, fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  plugins: [vue()],
  define: {
    __DEV__: JSON.stringify(mode !== 'production'),
  },
  resolve: {
    alias: [
      {
        find: /^@editor\/(.*)$/,
        replacement: fileURLToPath(new URL('../src/$1', import.meta.url)),
      },
      {
        find: /^@editor$/,
        replacement: fileURLToPath(new URL('../src/index.ts', import.meta.url)),
      },
    ],
  },
  server: {
    port: 5181,
    fs: {
      allow: [fileURLToPath(new URL('../', import.meta.url))],
    },
  },
}));
