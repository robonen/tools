import { tmpdir } from 'node:os';
import tailwindcss from '@tailwindcss/vite';

// macOS dev fix: Nuxt's vite-node IPC uses a unix socket under $TMPDIR, and the
// default macOS temp dir (/var/folders/…) pushes the socket path past the
// ~104-char sun_path limit → `connect EINVAL` on every request. Point $TMPDIR
// at a short directory so `nuxt dev` works. Other platforms are unaffected.
if (process.platform === 'darwin' && tmpdir().length > 30)
  process.env.TMPDIR = '/tmp';

export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4,
  },

  modules: [
    '@nuxt/fonts',
    './modules/extractor',
  ],

  vite: {
    plugins: [
      tailwindcss() as any,
    ],
  },

  css: ['~/assets/css/main.css'],

  ssr: true,

  // Dev-only: the file-based payload cache collides on parent+child routes that
  // share a segment (e.g. `/vue` is written as a file while `/vue/*` needs `vue`
  // to be a directory → ENOTDIR). Production prerender writes each route to its
  // own dir, so payload extraction is left enabled there.
  $development: {
    experimental: { payloadExtraction: false },
  },

  routeRules: {
    '/**': { prerender: true },
    // The MCP endpoint is a dynamic POST handler — never prerender it.
    '/mcp': { prerender: false },
  },

  nitro: {
    prerender: {
      crawlLinks: true,
    },
  },

  fonts: {
    families: [
      { name: 'Inter', provider: 'google', weights: [400, 500, 600, 700] },
      { name: 'JetBrains Mono', provider: 'google', weights: [400, 500] },
    ],
  },

  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      title: '@robonen/tools — Documentation',
      meta: [
        { name: 'description', content: 'Auto-generated documentation for the @robonen/tools monorepo' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#ffffff', media: '(prefers-color-scheme: light)' },
        { name: 'theme-color', content: '#0a0a0a', media: '(prefers-color-scheme: dark)' },
      ],
      htmlAttrs: {
        lang: 'en',
      },
      script: [
        {
          // Set the theme class before first paint to avoid a flash.
          innerHTML: `(function(){try{var t=localStorage.getItem('docs-theme');var d=t==='dark'||((!t||t==='system')&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`,
          tagPosition: 'head',
        },
      ],
    },
  },

  compatibilityDate: '2026-02-15',
});
