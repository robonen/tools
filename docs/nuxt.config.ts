import tailwindcss from '@tailwindcss/vite';

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

  routeRules: {
    '/**': { prerender: true },
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
    head: {
      title: '@robonen/tools — Documentation',
      meta: [
        { name: 'description', content: 'Auto-generated documentation for @robonen/tools monorepo' },
      ],
      htmlAttrs: {
        lang: 'en',
      },
    },
  },

  compatibilityDate: '2026-02-15',
});
