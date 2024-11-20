import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  entries: [
    'src/browsers',
    'src/multi',
  ],
  clean: true,
  declaration: true,
  rollup: {
    emitCJS: true,
    esbuild: {
      // minify: true,
    },
  },
});