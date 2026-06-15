export { default as CropRoot } from './CropRoot.vue';
export { default as CropArea } from './CropArea.vue';
export { default as CropGrid } from './CropGrid.vue';
export { default as CropHandle } from './CropHandle.vue';
export { default as CropOverlay } from './CropOverlay.vue';

export { provideCropContext, useCropContext } from './context';
export type { CropContext, CropDirection, CropUnits } from './context';

export type { CropAreaProps } from './CropArea.vue';
export type { CropGridProps } from './CropGrid.vue';
export type { CropHandleProps } from './CropHandle.vue';
export type { CropOverlayProps } from './CropOverlay.vue';
export type { CropRootEmits, CropRootProps } from './CropRoot.vue';

export type { CropBounds, CropHandlePosition, CropRect } from './utils';
export {
  CROP_HANDLE_POSITIONS,
  createRect,
  fitRectToRatio,
  minBox,
  moveRect,
  normalizeRect,
  resizeRect,
  resolveAspectRatio,
} from './utils';
