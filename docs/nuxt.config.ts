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
