import type { Options } from 'tsdown';

const BANNER = '/*! @robonen/tools | (c) 2026 Robonen Andrew | Apache-2.0 */';

export const sharedConfig = {
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  hash: false,
  outputOptions: {
    banner: BANNER,
  },
} satisfies Options;
