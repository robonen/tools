import type { Ref } from 'vue';
import { useEventListener } from '@robonen/vue';
import type { FlowContext } from '../context';
import type { XYPosition } from '../types';
import type { FlowApi } from './useViewportApi';

export interface KeyboardOptions {
  /** Keys that delete the selection. @default ['Backspace', 'Delete'] */
  deleteKeyCode?: string[];
  /** Pixel step for arrow-key node nudging. @default 5 */
  nudgeStep?: number;
}

const EDITABLE = /^(?:input|textarea|select)$/i;

/** True when focus is in a text field, so global shortcuts must stand down. */
function isTyping(): boolean {
  const el = document.activeElement as HTMLElement | null;
  return !!el && (EDITABLE.test(el.tagName) || el.isContentEditable);
}

/**
 * Canvas keyboard layer (scoped to the pane, suppressed while typing): Delete /
 * Backspace removes the selection, ⌘/Ctrl+A selects all, Arrows nudge selected
 * nodes (Shift = ×4), ⌘/Ctrl +/-/0 zoom-in/out/fit, Escape clears selection and
 * cancels an in-progress connection. Disabled via `disableKeyboardA11y`.
 */
export function useKeyboard(
  target: Ref<HTMLElement | undefined>,
  ctx: FlowContext,
  api: FlowApi,
  options: KeyboardOptions = {},
): void {
  const deleteKeys = options.deleteKeyCode ?? ['Backspace', 'Delete'];
  const step = options.nudgeStep ?? 5;

  function nudge(dx: number, dy: number): void {
    const sel = ctx.selection.value.nodes;
    if (sel.size === 0) return;
    const moves = new Map<string, XYPosition>();
    for (const id of sel) {
      const node = ctx.nodeLookup.value.get(id);
      if (node && node.draggable !== false)
        moves.set(id, { x: node.position.x + dx, y: node.position.y + dy });
    }
    if (moves.size === 0) return;
    ctx.updateNodePositions(moves, false);
    ctx.commitNodeDrag();
  }

  useEventListener(target, 'keydown', (event: KeyboardEvent) => {
    if (ctx.disableKeyboardA11y.value || !ctx.interactive.value || isTyping()) return;
    const mod = event.metaKey || event.ctrlKey;

    if (deleteKeys.includes(event.key)) {
      event.preventDefault();
      ctx.removeSelected();
      return;
    }

    if (mod && (event.key === 'a' || event.key === 'A')) {
      event.preventDefault();
      ctx.setSelection(
        [...ctx.nodeLookup.value.keys()],
        ctx.elementsSelectable.value ? [...ctx.edgeLookup.value.keys()] : [],
      );
      return;
    }

    if (event.key === 'Escape') {
      ctx.endConnection();
      ctx.clearSelection();
      return;
    }

    if (mod) {
      if (event.key === '=' || event.key === '+') {
        event.preventDefault();
        api.zoomIn();
        return;
      }
      if (event.key === '-') {
        event.preventDefault();
        api.zoomOut();
        return;
      }
      if (event.key === '0') {
        event.preventDefault();
        api.fitView();
        return;
      }
    }

    const dist = event.shiftKey ? step * 4 : step;
    const arrows: Record<string, XYPosition> = {
      ArrowUp: { x: 0, y: -dist },
      ArrowDown: { x: 0, y: dist },
      ArrowLeft: { x: -dist, y: 0 },
      ArrowRight: { x: dist, y: 0 },
    };
    const delta = arrows[event.key];
    if (delta) {
      event.preventDefault();
      nudge(delta.x, delta.y);
    }
  });
}
