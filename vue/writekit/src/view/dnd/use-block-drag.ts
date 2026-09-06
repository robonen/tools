import type { ShallowRef } from 'vue';
import { shallowReactive, shallowRef } from 'vue';
import { useRafFn, useStateMachine } from '@robonen/vue';
import { moveBefore, nodeSelection } from '../../model';
import { moveBlocks } from '../../commands';
import { createTransaction } from '../../state';
import type { WritekitContextValue } from '../context';
import { useEventListener } from '../composables';
import type { BlockRow } from './geometry';
import { autoscrollSpeed, boundaryY, distance, dropIndexAt } from './geometry';

export interface DragIndicator {
  readonly x: number;
  readonly y: number;
  readonly width: number;
}

/** A live drag: what the ghost and the drop indicator render from. Mutated per frame. */
export interface DragSession {
  readonly ids: readonly string[];
  pointer: { x: number; y: number };
  /** Boundary index under the pointer; `null` while the drop would change nothing. */
  dropIndex: number | null;
  indicator: DragIndicator | null;
}

export interface UseBlockDragOptions {
  /** Pointer travel before a press becomes a drag; below it, releasing is a click. @default 4 */
  readonly threshold?: number;
  /** Distance from a scroll edge at which the editor starts scrolling. @default 48 */
  readonly scrollEdge?: number;
  /** Top scroll speed, px per frame. @default 20 */
  readonly scrollSpeed?: number;
}

export interface UseBlockDragReturn {
  readonly session: ShallowRef<DragSession | null>;
  /** Reactive: a press has been made but not resolved into a drag or a click. */
  readonly armed: () => boolean;
  /**
   * Begin from a handle's `pointerdown`. Releasing without travelling past the
   * threshold calls `onClick` — the same handle opens a menu on click and
   * moves the block on drag.
   */
  readonly press: (event: PointerEvent, blockId: string, onClick?: (blockId: string) => void) => void;
  readonly cancel: () => void;
}

function scrollParentOf(el: HTMLElement): HTMLElement {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight)
      return node;
  }
  return (el.ownerDocument.scrollingElement ?? el.ownerDocument.documentElement) as HTMLElement;
}

/**
 * Pointer-driven block reordering. No native drag and drop: it cannot be
 * styled, has no drop indicator, ignores touch on iOS, and a `draggable`
 * child inside a contenteditable fights text selection.
 *
 * Block rects are measured once when the drag begins, relative to the content
 * root; each frame maps the pointer to a boundary by binary search and adds
 * the root's current offset, so scrolling needs no re-measure. The dragged
 * blocks become the node selection for the duration, which is what the
 * consumer's `[data-selected]` styling and Escape/Backspace already handle.
 */
export function useBlockDrag(ctx: WritekitContextValue, options: UseBlockDragOptions = {}): UseBlockDragReturn {
  const threshold = options.threshold ?? 4;
  const scrollEdge = options.scrollEdge ?? 48;
  const scrollSpeed = options.scrollSpeed ?? 20;

  const session = shallowRef<DragSession | null>(null);

  let pressedId = '';
  let pointerId = -1;
  let origin = { x: 0, y: 0 };
  let onClick: ((blockId: string) => void) | undefined;
  let rows: BlockRow[] = [];
  let rootTop = 0;
  let scroller: HTMLElement | null = null;
  let userSelect = '';

  const machine = useStateMachine({
    initial: 'idle',
    states: {
      idle: { on: { PRESS: 'armed' } },
      armed: { on: { MOVE: 'dragging', RELEASE: 'idle', CANCEL: 'idle' } },
      dragging: { on: { RELEASE: 'idle', CANCEL: 'idle' } },
    },
  });

  const frame = useRafFn(update, { immediate: false });

  function ids(): readonly string[] {
    const sel = ctx.writekit.state.selection;
    if (sel.kind === 'node' && sel.ids.includes(pressedId))
      return ctx.writekit.state.doc.content.filter(block => sel.ids.includes(block.id)).map(block => block.id);
    return [pressedId];
  }

  function measure(root: HTMLElement): void {
    rootTop = root.getBoundingClientRect().top;
    rows = [];

    for (const block of ctx.writekit.state.doc.content) {
      const el = ctx.blockViews.get(block.id);
      if (!el)
        continue;
      const rect = el.getBoundingClientRect();
      rows.push({ id: block.id, top: rect.top - rootTop, bottom: rect.bottom - rootTop });
    }
  }

  function begin(): void {
    const root = ctx.contentRoot.value;
    if (!root)
      return;

    measure(root);
    scroller = scrollParentOf(root);

    const dragged = ids();
    session.value = shallowReactive<DragSession>({ ids: dragged, pointer: { ...origin }, dropIndex: null, indicator: null });

    ctx.dispatch(createTransaction(ctx.writekit.state).setSelection(nodeSelection(dragged)).setMeta('selectionOnly', true));
    root.setAttribute('data-writekit-dragging', '');
    userSelect = root.style.userSelect;
    root.style.userSelect = 'none';
    frame.resume();
  }

  function update(): void {
    const live = session.value;
    const root = ctx.contentRoot.value;
    if (!live || !root)
      return;

    if (scroller) {
      const bounds = scroller === root.ownerDocument.scrollingElement
        ? { top: 0, bottom: root.ownerDocument.defaultView?.innerHeight ?? 0 }
        : scroller.getBoundingClientRect();
      const speed = autoscrollSpeed(live.pointer.y, bounds.top, bounds.bottom, scrollEdge, scrollSpeed);
      if (speed)
        scroller.scrollTop += speed;
    }

    const rootRect = root.getBoundingClientRect();
    const index = dropIndexAt(rows, live.pointer.y - rootRect.top);
    const content = ctx.writekit.state.doc.content;
    const next = moveBefore(content, live.ids, index);
    const noop = next.every((block, i) => block === content[i]);
    const y = boundaryY(rows, index);

    live.dropIndex = noop ? null : index;
    live.indicator = noop || y === null ? null : { x: rootRect.left, y: rootRect.top + y, width: rootRect.width };
  }

  function end(commit: boolean): void {
    const live = session.value;
    const root = ctx.contentRoot.value;

    frame.pause();

    if (root) {
      root.removeAttribute('data-writekit-dragging');
      root.style.userSelect = userSelect;
    }

    session.value = null;

    if (live && commit && live.dropIndex !== null)
      ctx.exec(moveBlocks(live.ids, live.dropIndex));
  }

  function onPointerMove(event: PointerEvent): void {
    if (machine.matches('idle') || event.pointerId !== pointerId)
      return;

    if (machine.matches('armed')) {
      if (distance(origin.x, origin.y, event.clientX, event.clientY) < threshold)
        return;
      machine.send('MOVE');
      begin();
    }

    if (session.value) {
      session.value.pointer = { x: event.clientX, y: event.clientY };
      event.preventDefault();
    }
  }

  function onPointerUp(event: PointerEvent): void {
    if (machine.matches('idle') || event.pointerId !== pointerId)
      return;

    const wasClick = machine.matches('armed');
    machine.send('RELEASE');
    end(true);

    if (wasClick)
      onClick?.(pressedId);
  }

  function cancel(): void {
    if (machine.matches('idle'))
      return;
    machine.send('CANCEL');
    end(false);
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && session.value) {
      event.preventDefault();
      event.stopPropagation();
      cancel();
    }
  }

  function press(event: PointerEvent, blockId: string, click?: (blockId: string) => void): void {
    if (event.button !== 0 || !ctx.config.editable || !machine.matches('idle'))
      return;

    pressedId = blockId;
    pointerId = event.pointerId;
    origin = { x: event.clientX, y: event.clientY };
    onClick = click;
    machine.send('PRESS');
  }

  // Listeners stay on for the component's life and return at once while idle:
  // a press is followed by its move/up within a task or two, sooner than a
  // reactive target could attach them, and a stale pointer id is ignored.
  const target = typeof window === 'undefined' ? undefined : globalThis;
  useEventListener(target, 'pointermove', onPointerMove as (event: Event) => void, { passive: false });
  useEventListener(target, 'pointerup', onPointerUp as (event: Event) => void);
  useEventListener(target, 'pointercancel', cancel);
  useEventListener(target, 'keydown', onKeydown as (event: Event) => void, { capture: true });

  return { session, armed: () => machine.matches('armed'), press, cancel };
}
