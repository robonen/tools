import type { WatchOptions } from 'vue';

export interface ConfigurableFlush {
  /**
   * Timing for the watcher flush
   *
   * @default 'pre'
   */
  flush?: WatchOptions['flush'];
}
