import type { Ref, ShallowRef } from 'vue';
import { useFlowContext } from '../context';
import type { FlowSelection } from '../context';
import type { Viewport } from '../types';
import type { FlowApi } from './useViewportApi';
import { useViewportApi } from './useViewportApi';

/** Everything a consumer needs to drive a flow imperatively from app code. */
export interface UseFlowReturn extends FlowApi {
  /** Reactive viewport. */
  viewport: Ref<Viewport>;
  /** Reactive selection sets. */
  selection: ShallowRef<FlowSelection>;
  selectNode: (id: string, additive?: boolean) => void;
  selectEdge: (id: string, additive?: boolean) => void;
  setSelection: (nodes: string[], edges: string[]) => void;
  clearSelection: () => void;
  removeSelected: () => void;
}

/**
 * Public consumer hook (the "useReactFlow"/"useVueFlow" equivalent). Call from
 * any component inside a `FlowRoot` to read reactive state and drive the canvas:
 * `fitView`, `setViewport`, `zoomIn/Out`, `screenToFlowPosition`, selection, and
 * node/edge getters. Throws if used outside a `FlowRoot`.
 */
export function useFlow(): UseFlowReturn {
  const ctx = useFlowContext();
  const api = useViewportApi(ctx);
  return {
    ...api,
    viewport: ctx.viewport,
    selection: ctx.selection,
    selectNode: ctx.selectNode,
    selectEdge: ctx.selectEdge,
    setSelection: ctx.setSelection,
    clearSelection: ctx.clearSelection,
    removeSelected: ctx.removeSelected,
  };
}
