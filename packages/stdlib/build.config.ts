import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  rollup: {
    emitCJS: true,
    esbuild: {
        minify: true,
    },
  },
});