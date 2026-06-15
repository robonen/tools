import type { MaybeRefOrGetter, Ref } from 'vue';
import { onScopeDispose, shallowRef, toValue } from 'vue';
import { useEventListener } from '@robonen/vue';
import { clamp } from '@robonen/stdlib';
import type { FlowContext } from '../context';
import type { InternalNode, XYPosition } from '../types';
import { snapPoint } from '../utils';
import { capturePointer, releasePointer } from './dom';

/** Constrain a dragged position by a node's `extent` (parent box or explicit rect). */
function applyExtent(pos: XYPosition, node: InternalNode, lookup: Map<string, InternalNode>): XYPosition {
  if (node.extent === 'parent' && node.parentId) {
    const parent = lookup.get(node.parentId);
    if (!parent) return pos;
    return {
      x: clamp(pos.x, 0, Math.max(0, parent.measured.width - node.measured.width)),
      y: clamp(pos.y, 0, Math.max(0, parent.measured.height - node.measured.height)),
    };
  }
  if (Array.isArray(node.extent)) {
    const [[x1, y1], [x2, y2]] = node.extent;
    return {
      x: clamp(pos.x, x1, x2 - node.measured.width),
      y: clamp(pos.y, y1, y2 - node.measured.height),
    };
  }
  return pos;
}

export interface NodeDragOptions {
  /** Pixels the pointer must travel before a click becomes a drag. @default 1 */
  threshold?: number;
}

/** Elements inside a node that must not initiate a drag. */
const NO_DRAG_SELECTOR = 'input, textarea, select, button, [contenteditable="true"], [data-handleid], .nodrag';

/**
 * Pointer-capture node drag. Moves the node (and every co-selected node) by the
 * pointer delta converted to flow space (`delta / zoom`), optionally snapped to
 * the grid. Positions are written to the transient drag overlay every frame and
 * committed to the model once on pointerup — never 60×/sec.
 *
 * Stops propagation so the pane never pans while a node is grabbed. A pointer
 * that never crosses `threshold` stays a click (selection handled elsewhere).
 */
export function useNodeDrag(
  target: Ref<HTMLElement | undefined>,
  ctx: FlowContext,
  nodeId: MaybeRefOrGetter<string>,
  options: NodeDragOptions = {},
): { dragging: Readonly<Ref<boolean>> } {
  const threshold = options.threshold ?? 1;
  const dragging = shallowRef(false);

  let pointerId = -1;
  let startX = 0;
  let startY = 0;
  let started = false;
  let lastX = 0;
  let lastY = 0;
  let rafId: number | null = null;
  /** id → starting flow-space position, snapshot at pointerdown. */
  let snapshot = new Map<string, XYPosition>();
  /** Reused across RAF frames — only the container is pooled; entries are fresh. */
  const nextPositions = new Map<string, XYPosition>();

  function eligible(): boolean {
    if (!ctx.interactive.value || !ctx.nodesDraggable.value) return false;
    const node = ctx.nodeLookup.value.get(toValue(nodeId));
    return !!node && node.draggable !== false;
  }

  function collectDragSet(id: string): Map<string, XYPosition> {
    const set = new Map<string, XYPosition>();
    const selected = ctx.selection.value.nodes;
    const ids = selected.has(id) && selected.size > 1 ? selected : new Set([id]);
    for (const nid of ids) {
      const node = ctx.nodeLookup.value.get(nid);
      if (node && node.draggable !== false)
        set.set(nid, { x: node.position.x, y: node.position.y });
    }
    return set;
  }

  function flush() {
    rafId = null;
    const dx = (lastX - startX) / ctx.viewport.value.zoom;
    const dy = (lastY - startY) / ctx.viewport.value.zoom;
    const snap = ctx.snapToGrid.value;
    const grid = ctx.snapGrid.value;
    const next = nextPositions;
    next.clear();
    for (const [id, start] of snapshot) {
      let pos: XYPosition = { x: start.x + dx, y: start.y + dy };
      if (snap) pos = snapPoint(pos, grid);
      const node = ctx.nodeLookup.value.get(id);
      if (node?.extent) pos = applyExtent(pos, node, ctx.nodeLookup.value);
      next.set(id, pos);
    }
    ctx.updateNodePositions(next, true);
  }

  function schedule() {
    if (rafId === null) rafId = requestAnimationFrame(flush);
  }

  onScopeDispose(() => {
    if (rafId !== null) cancelAnimationFrame(rafId);
  });

  useEventListener(target, 'pointerdown', (event: PointerEvent) => {
    if (event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest(NO_DRAG_SELECTOR)) return;
    // Always stop the pane from treating this as a pan, even when not draggable.
    event.stopPropagation();
    if (!eligible()) return;

    const id = toValue(nodeId);
    snapshot = collectDragSet(id);
    if (snapshot.size === 0) return;

    pointerId = event.pointerId;
    startX = lastX = event.clientX;
    startY = lastY = event.clientY;
    started = false;
    capturePointer(target.value, event.pointerId);
  });

  useEventListener(target, 'pointermove', (event: PointerEvent) => {
    if (pointerId !== event.pointerId || snapshot.size === 0) return;
    lastX = event.clientX;
    lastY = event.clientY;

    if (!started) {
      if (Math.abs(lastX - startX) < threshold && Math.abs(lastY - startY) < threshold) return;
      started = true;
      dragging.value = true;
    }
    schedule();
  });

  function endDrag(event: PointerEvent) {
    if (pointerId !== event.pointerId) return;
    releasePointer(target.value, event.pointerId);
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (started) {
      flush();
      ctx.commitNodeDrag();
    }
    pointerId = -1;
    started = false;
    dragging.value = false;
    snapshot = new Map();
  }

  useEventListener(target, 'pointerup', endDrag);
  useEventListener(target, 'pointercancel', endDrag);

  return { dragging };
}
