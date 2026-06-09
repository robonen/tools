export { default as QrCodeRoot } from './QrCodeRoot.vue';
export { default as QrCodeBackground } from './QrCodeBackground.vue';
export { default as QrCodeCells } from './QrCodeCells.vue';
export { default as QrCodeMarker } from './QrCodeMarker.vue';
export { default as QrCodeMarkers } from './QrCodeMarkers.vue';
export { default as QrCodeLogo } from './QrCodeLogo.vue';

export type { QrCodeRootProps } from './QrCodeRoot.vue';
export type { QrCodeBackgroundProps } from './QrCodeBackground.vue';
export type { QrCodeCellsProps } from './QrCodeCells.vue';
export type { QrCodeMarkerProps } from './QrCodeMarker.vue';
export type { QrCodeMarkersProps } from './QrCodeMarkers.vue';
export type { QrCodeLogoProps } from './QrCodeLogo.vue';

export { provideQrCodeContext, useQrCodeContext } from './context';
export type { QrCodeContext, QrCodeErrorCorrection, QrCodeMargin } from './context';

export {
  cellList,
  cellsPath,
  circlePath,
  markerBallPath,
  markerFramePath,
  markerPlacements,
  roundedRectPath,
} from './utils';
export type {
  MarkerCorner,
  MarkerPlacement,
  QrCellDescriptor,
  QrCellPattern,
  QrCodeRegion,
  QrMarkerBall,
  QrMarkerFrame,
} from './utils';
