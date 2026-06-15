import type { ComputedRef, Ref } from 'vue';
import { useContextFactory } from '@robonen/vue';
import type { HistogramBarChannel, HistogramChannel, HistogramData, HistogramScaleType } from './utils';

/**
 * Context shared between `HistogramRoot` and its descendants.
 *
 * `bars` returns the normalised heights `[0, 1]` for the requested concrete
 * channel under the active scale (with the all-zero / empty guard applied), so
 * `HistogramBars` never re-implements the projection or touches the peak.
 */
export interface HistogramContext {
  /** Raw per-channel bin data, as supplied to the root. */
  data: Ref<HistogramData>;
  /** The root's primary channel (`'l'`/`'r'`/`'g'`/`'b'`/`'rgb'`). */
  channel: Ref<HistogramChannel>;
  /** Bar-height mapping (`'linear'` or `'log'`). */
  scaleType: Ref<HistogramScaleType>;
  /** Requested bin count (bars are clamped/derived from the supplied data length). */
  bins: Ref<number>;
  /** Whether the histogram is non-interactive / dimmed. */
  disabled: Ref<boolean>;
  /** Whether the resolved primary channel has any non-zero data. */
  hasData: ComputedRef<boolean>;
  /**
   * Normalised heights `[0, 1]` for `channel`. Empty/all-zero input yields
   * all-zero heights — never `NaN`. Stable function identity.
   */
  bars: (channel: HistogramBarChannel) => number[];
}

export const {
  inject: useHistogramContext,
  provide: provideHistogramContext,
} = useContextFactory<HistogramContext>('histogram');
