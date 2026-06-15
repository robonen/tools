export { default as GradientEditorRoot } from './GradientEditorRoot.vue';
export { default as GradientEditorAngle } from './GradientEditorAngle.vue';
export { default as GradientEditorColorEditor } from './GradientEditorColorEditor.vue';
export { default as GradientEditorStop } from './GradientEditorStop.vue';
export { default as GradientEditorStops } from './GradientEditorStops.vue';
export { default as GradientEditorTrack } from './GradientEditorTrack.vue';

export type { GradientEditorRootEmits, GradientEditorRootProps } from './GradientEditorRoot.vue';
export type { GradientEditorAngleProps } from './GradientEditorAngle.vue';
export type { GradientEditorColorEditorProps } from './GradientEditorColorEditor.vue';
export type { GradientEditorStopProps } from './GradientEditorStop.vue';
export type { GradientEditorStopsProps } from './GradientEditorStops.vue';
export type { GradientEditorTrackProps } from './GradientEditorTrack.vue';

export type {
  GradientEditorContext,
  GradientEditorDirection,
  GradientEditorValueText,
  GradientStop,
  GradientStopPatch,
  GradientType,
} from './context';
export {
  provideGradientEditorContext,
  useGradientEditorContext,
} from './context';

export {
  buildCssGradient,
  defaultStopValueText,
  interpolateColorAt,
  neighboursAt,
  sortStops,
} from './utils';
