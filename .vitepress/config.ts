import { defineConfig } from 'vitepress';

export default defineConfig({
  lang: 'ru-RU',
  title: "Tools",
  description: "A set of tools and utilities for web development",
  rewrites: {
    'packages/:pkg/README.md': 'packages/:pkg/index.md',
  },
  themeConfig: {
    sidebar: [
      {
        text: 'Пакеты',
        items: [
          { text: '@robonen/tsconfig', link: '/packages/tsconfig/' },
          { text: '@robonen/renovate', link: '/packages/renovate/' },
          { text: '@robonen/stdlib', link: '/packages/stdlib/' },
        ],
      },
    ],
  },
});
