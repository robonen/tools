import { defineCollection, defineContentConfig } from '@nuxt/content';

const repositories = [
  '../configs/tsconfig',
  '../core/stdlib',
  '../core/platform',
  '../infra/renovate',
  '../web/vue',
];

export default defineContentConfig({
  collections: repositories.reduce((acc, repo) => {
    const name = repo.split('/').pop();

    acc[name] = defineCollection({
      source: {
        include: `**/*.md`,
        exclude: ['**/node_modules/**', '**/dist/**'],
        cwd: repo,
      },
      type: 'page',
    });

    return acc;
  }, {}),
});
