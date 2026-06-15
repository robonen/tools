<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The region that captures right-click (and touch/pen long-press), preventing the
 * native context menu and opening the menu anchored at the pointer position.
 * Wrap whatever area should respond to a secondary click.
 */
export interface ContextMenuTriggerProps extends PrimitiveProps {
  disabled?: boolean;
}

// Fully static; hoisted so the trigger does not reallocate it on every render.
const TRIGGER_STYLE = {
  WebkitTouchCallout: 'none',
  pointerEvents: 'auto',
} as const;
</script>

<script setup lang="ts">
import { nextTick, onMounted, onScopeDispose, shallowRef } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { MenuAnchor, useMenuContext } from '../menu';
import { Primitive } from '../../internal/primitive';
import { useContextMenuRootContext } from './context';

const { disabled = false, as = 'span' } = defineProps<ContextMenuTriggerProps>();

const menuCtx = useMenuContext();
const ctxMenuCtx = useContextMenuRootContext();
const { forwardRef, currentElement } = useForwardExpose();

const point = shallowRef({ x: 0, y: 0 });
// Reused scratch rect: getBoundingClientRect is polled by floating-ui on
// scroll/resize, so we mutate a single object in place (stable hidden class,
// zero per-call allocation) instead of returning a fresh literal each time.
const scratchRect = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  toJSON: () => {},
};
const virtualEl = {
  getBoundingClientRect: () => {
    const { x, y } = point.value;
    scratchRect.x = x;
    scratchRect.y = y;
    scratchRect.top = y;
    scratchRect.right = x;
    scratchRect.bottom = y;
    scratchRect.left = x;
    return scratchRect;
  },
};

let longPressTimer: ReturnType<typeof setTimeout> | undefined;

function clearLongPress() {
  clearTimeout(longPressTimer);
}

onScopeDispose(clearLongPress);

// Long-press applies to touch AND pen; mouse uses the native contextmenu event.
function isTouchOrPen(event: PointerEvent): boolean {
  return event.pointerType !== 'mouse';
}

function handleOpen(event: MouseEvent | PointerEvent) {
  point.value = { x: event.clientX, y: event.clientY };
  ctxMenuCtx.onOpenChange(true);
}

async function handleContextMenu(event: MouseEvent) {
  if (disabled) return;
  // Wait a microtask so a nested ContextMenuTrigger (whose own handler runs
  // first as the event bubbles inward-out) can call `preventDefault()` and
  // suppress this outer one. Also lets a consumer cancel the open by calling
  // `preventDefault()` on the contextmenu event.
  await nextTick();
  if (event.defaultPrevented) return;
  clearLongPress();
  handleOpen(event);
  event.preventDefault();
}

function handlePointerDown(event: PointerEvent) {
  if (disabled || event.button !== 0 || !isTouchOrPen(event)) return;
  // Clear here in case there are multiple touch points.
  clearLongPress();
  longPressTimer = setTimeout(handleOpen, ctxMenuCtx.pressOpenDelay.value, event);
}

function handlePointerEvent(event: PointerEvent) {
  // A drag/scroll/lift gesture must cancel the pending long-press open.
  if (isTouchOrPen(event)) clearLongPress();
}

onMounted(() => {
  if (currentElement.value) ctxMenuCtx.triggerElement.value = currentElement.value;
});
</script>

<template>
  <MenuAnchor as="template" :reference="virtualEl">
    <Primitive
      :ref="forwardRef"
      :as="as"
      :data-state="menuCtx.open.value ? 'open' : 'closed'"
      :data-disabled="disabled ? '' : undefined"
      :style="TRIGGER_STYLE"
      @contextmenu="handleContextMenu"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerEvent"
      @pointercancel="handlePointerEvent"
      @pointerup="handlePointerEvent"
    >
      <slot />
    </Primitive>
  </MenuAnchor>
</template>
