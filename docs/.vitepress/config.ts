import { defineConfig } from 'vitepress';

export default defineConfig({
  lang: 'ru-RU',
  title: "Toolkit",
  description: "A collection of typescript and javascript development tools",
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
