export { default as TransformBoxRoot } from './TransformBoxRoot.vue';
export type { TransformBoxRootEmits, TransformBoxRootProps } from './TransformBoxRoot.vue';

export { default as TransformBoxHandle } from './TransformBoxHandle.vue';
export type { TransformBoxHandleProps } from './TransformBoxHandle.vue';

export { default as TransformBoxRotateHandle } from './TransformBoxRotateHandle.vue';
export type { TransformBoxRotateHandleProps } from './TransformBoxRotateHandle.vue';

export { default as TransformBoxStatus } from './TransformBoxStatus.vue';
export type { TransformBoxStatusProps } from './TransformBoxStatus.vue';

export {
  provideTransformBoxContext,
  useTransformBoxContext,
} from './context';
export type {
  TransformBoxContext,
  TransformBoxDirection,
  TransformBoxModifiers,
} from './context';

export {
  applyAspectRatio,
  boxCenter,
  constrainRect,
  decomposeTransform,
  handleAxes,
  handleLabel,
  localToWorld,
  moveBox,
  normalizeRotation,
  pointerAngle,
  resizeEdge,
  resolvePivot,
  rotatePoint,
  rotateVector,
  rotationFromPointer,
  shortestAngleDelta,
  snapRotation,
  worldToLocal,
} from './utils';
export type {
  Point,
  ResizeEdgeOptions,
  ResizeResult,
  TransformBoxHandlePosition,
  TransformBoxPivot,
  TransformBoxValue,
} from './utils';
