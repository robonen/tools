import { URL, fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  plugins: [vue(), tailwindcss()],
  define: {
    __DEV__: JSON.stringify(mode !== 'production'),
  },
  resolve: {
    alias: [
      // Order matters: subpath alias must come before the bare-specifier one.
      {
        find: /^@primitives\/(.*)$/,
        replacement: fileURLToPath(new URL('../src/$1', import.meta.url)),
      },
      {
        find: /^@primitives$/,
        replacement: fileURLToPath(new URL('../src/index.ts', import.meta.url)),
      },
    ],
  },
  server: {
    port: 5180,
    fs: {
      // Allow importing from primitives source one level up.
      allow: [fileURLToPath(new URL('../', import.meta.url))],
    },
  },
}));
