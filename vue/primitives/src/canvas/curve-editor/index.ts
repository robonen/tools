export { default as CurveEditorRoot } from './CurveEditorRoot.vue';
export { default as CurveEditorCurve } from './CurveEditorCurve.vue';
export { default as CurveEditorGrid } from './CurveEditorGrid.vue';
export { default as CurveEditorHandle } from './CurveEditorHandle.vue';
export { default as CurveEditorPoint } from './CurveEditorPoint.vue';

export type { CurveEditorRootEmits, CurveEditorRootProps } from './CurveEditorRoot.vue';
export type { CurveEditorCurveProps } from './CurveEditorCurve.vue';
export type { CurveEditorGridProps } from './CurveEditorGrid.vue';
export type { CurveEditorHandleProps } from './CurveEditorHandle.vue';
export type { CurveEditorPointProps } from './CurveEditorPoint.vue';

export {
  type CurveEditorAnchor,
  type CurveEditorChannel,
  type CurveEditorContext,
  type CurveEditorDirection,
  type CurveEditorHandleSide,
  type CurveEditorInterpolation,
  provideCurveEditorContext,
  useCurveEditorContext,
} from './context';

export {
  anchorsToPoints,
  buildEvaluator,
  clampAnchorX,
  clampAnchorY,
  formatAnchorValueText,
  sortAnchors,
} from './utils';
