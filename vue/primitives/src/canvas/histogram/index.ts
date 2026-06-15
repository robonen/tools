export { default as HistogramRoot } from './HistogramRoot.vue';
export { default as HistogramBars } from './HistogramBars.vue';
export type { HistogramRootProps } from './HistogramRoot.vue';
export type { HistogramBarsProps } from './HistogramBars.vue';
export {
  provideHistogramContext,
  useHistogramContext,
  type HistogramContext,
} from './context';
export {
  HISTOGRAM_CHANNEL_COLORS,
  getChannelBins,
  histogramMax,
  isSingleChannelData,
  projectBarHeight,
  projectBars,
} from './utils';
export type {
  HistogramBarChannel,
  HistogramChannel,
  HistogramData,
  HistogramScaleType,
} from './utils';
