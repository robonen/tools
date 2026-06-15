// Composable parts. The per-item `FlowNode` / `FlowEdge` components are internal
// (rendered by the renderers); the public `FlowNode` / `FlowEdge` names below are
// the DATA types consumers bind their `nodes` / `edges` arrays to.
export { default as FlowBackground } from './FlowBackground.vue';
export { default as FlowConnectionLine } from './FlowConnectionLine.vue';
export { default as FlowControls } from './FlowControls.vue';
export { default as FlowEdgeRenderer } from './FlowEdgeRenderer.vue';
export { default as FlowHandle } from './FlowHandle.vue';
export { default as FlowMiniMap } from './FlowMiniMap.vue';
export { default as FlowNodeRenderer } from './FlowNodeRenderer.vue';
export { default as FlowNodeResizer } from './FlowNodeResizer.vue';
export { default as FlowNodeToolbar } from './FlowNodeToolbar.vue';
export { default as FlowPane } from './FlowPane.vue';
export { default as FlowPanel } from './FlowPanel.vue';
export { default as FlowRoot } from './FlowRoot.vue';
export { default as FlowViewport } from './FlowViewport.vue';

export type { FlowBackgroundProps, FlowBackgroundVariant } from './FlowBackground.vue';
export type { FlowConnectionLineProps } from './FlowConnectionLine.vue';
export type { FlowControlsProps } from './FlowControls.vue';
export type { FlowEdgeRendererProps } from './FlowEdgeRenderer.vue';
export type { FlowHandleProps } from './FlowHandle.vue';
export type { FlowMiniMapProps } from './FlowMiniMap.vue';
export type { FlowNodeRendererProps } from './FlowNodeRenderer.vue';
export type { FlowNodeResizerProps } from './FlowNodeResizer.vue';
export type { FlowNodeToolbarProps } from './FlowNodeToolbar.vue';
export type { FlowPaneProps } from './FlowPane.vue';
export type { FlowPanelPosition, FlowPanelProps } from './FlowPanel.vue';
export type { FlowRootEmits, FlowRootProps } from './FlowRoot.vue';
export type { FlowViewportProps } from './FlowViewport.vue';

export {
  FLOW_EDGES_COLLECTION,
  FLOW_NODES_COLLECTION,
  provideFlowContext,
  provideFlowNodeContext,
  useFlowContext,
  useFlowNodeContext,
} from './context';
export type { FlowContext, FlowNodeContext, FlowSelection, HandleRegistration } from './context';

export type {
  AriaLabelConfig,
  Connection,
  ConnectionMode,
  ConnectionState,
  Dimensions,
  EdgeChange,
  EdgeMarker,
  EdgeMarkerType,
  FlowEdge,
  FlowNode,
  HandleBound,
  HandleBounds,
  HandleType,
  InternalNode,
  IsValidConnection,
  NodeChange,
  Position,
  Rect,
  SelectionMode,
  Viewport,
  XYPosition,
} from './types';

export type { FitViewOptions, NodeBox, PaneOrigin } from './utils';
export {
  clampZoom,
  findHandle,
  fitViewTransform,
  flowToScreen,
  getAbsoluteHandlePoint,
  getDefaultEndpoint,
  getHandleBoundsFromDom,
  getNodePositionAbsolute,
  getNodesBounds,
  getNodesInsideRect,
  nodeInRect,
  rectContains,
  rectsIntersect,
  screenToFlow,
  snapPoint,
  visibleFlowRect,
  wheelToZoomFactor,
  zoomAtPointer,
} from './utils';

export type { PathResult } from './edge-paths';
export {
  getBezierPath,
  getEdgeCenter,
  getMarkerId,
  getSmoothStepPath,
  getStepPath,
  getStraightPath,
} from './edge-paths';

export type { ConnectionTarget } from './connection';
export { buildConnection, connectionToEdgeId, findClosestHandle } from './connection';

export { addEdge, applyEdgeChanges, applyNodeChanges } from './changes';

export { getVisibleEdgeIds, getVisibleNodeIds } from './virtualization';

export { usePanZoom } from './composables/usePanZoom';
export type { PanZoomOptions } from './composables/usePanZoom';
export { useNodeDrag } from './composables/useNodeDrag';
export type { NodeDragOptions } from './composables/useNodeDrag';
export { useConnection } from './composables/useConnection';
export { useMarquee } from './composables/useMarquee';
export type { MarqueeRect } from './composables/useMarquee';
export { useKeyboard } from './composables/useKeyboard';
export type { KeyboardOptions } from './composables/useKeyboard';
export { useViewportApi } from './composables/useViewportApi';
export type { FitViewParams, FlowApi } from './composables/useViewportApi';
export { useFlow } from './composables/useFlow';
export type { UseFlowReturn } from './composables/useFlow';
export { useNodesInView } from './composables/useNodesInView';
export type { UseNodesInViewOptions, UseNodesInViewReturn } from './composables/useNodesInView';
