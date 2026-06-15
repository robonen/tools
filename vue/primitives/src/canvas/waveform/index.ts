export { default as WaveformRoot } from './WaveformRoot.vue';
export { default as WaveformBars } from './WaveformBars.vue';
export { default as WaveformCursor } from './WaveformCursor.vue';
export { default as WaveformEmpty } from './WaveformEmpty.vue';
export { default as WaveformPath } from './WaveformPath.vue';
export { default as WaveformRegion } from './WaveformRegion.vue';
export { default as WaveformRegionHandle } from './WaveformRegionHandle.vue';
export { default as WaveformSelectionPreview } from './WaveformSelectionPreview.vue';

export type {
  WaveformDirection,
  WaveformProjection,
  WaveformRegionContext,
  WaveformRegionEdge,
  WaveformTimeFormatter,
} from './context';
export type {
  WaveformBar,
  WaveformMode,
  WaveformPeaksRange,
  WaveformRegionData,
} from './utils';

export type { WaveformRootEmits, WaveformRootProps } from './WaveformRoot.vue';
export type { WaveformBarsProps } from './WaveformBars.vue';
export type { WaveformCursorProps } from './WaveformCursor.vue';
export type { WaveformEmptyProps } from './WaveformEmpty.vue';
export type { WaveformPathProps } from './WaveformPath.vue';
export type { WaveformRegionProps } from './WaveformRegion.vue';
export type { WaveformRegionHandleProps } from './WaveformRegionHandle.vue';
export type { WaveformSelectionPreviewProps } from './WaveformSelectionPreview.vue';
