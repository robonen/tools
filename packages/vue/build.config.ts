import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  externals: ['vue'],
  rollup: {
    inlineDependencies: true,
    esbuild: {
        // minify: true,
    },
  },
});