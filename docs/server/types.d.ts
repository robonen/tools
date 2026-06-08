/** Types for the Nitro virtual module injected by `modules/extractor`. */
declare module '#docs/server-metadata' {
  import type { DocsMetadata } from '../modules/extractor/types';

  const metadata: DocsMetadata;
  export default metadata;
}
