import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  externals: ['vue'],
  rollup: {
    esbuild: {
        // minify: true,
    },
  },
});