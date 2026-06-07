<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface ContextMenuTriggerProps extends PrimitiveProps {
  disabled?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onScopeDispose, shallowRef } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { MenuAnchor, useMenuContext } from '../menu';
import { Primitive } from '../primitive';
import { useContextMenuRootContext } from './context';

const { disabled = false, as = 'span' } = defineProps<ContextMenuTriggerProps>();

const menuCtx = useMenuContext();
const ctxMenuCtx = useContextMenuRootContext();
const { forwardRef } = useForwardExpose();

const point = shallowRef({ x: 0, y: 0 });
const virtualEl = computed(() => ({
  getBoundingClientRect: () => ({
    x: point.value.x,
    y: point.value.y,
    width: 0,
    height: 0,
    top: point.value.y,
    right: point.value.x,
    bottom: point.value.y,
    left: point.value.x,
    toJSON: () => {},
  }),
}));

let longPressTimer: ReturnType<typeof setTimeout> | undefined;
const LONG_PRESS_DELAY = 700;

function clearLongPress() {
  clearTimeout(longPressTimer);
}

onScopeDispose(clearLongPress);

function handleContextMenu(event: MouseEvent) {
  if (disabled) return;
  clearLongPress();
  point.value = { x: event.clientX, y: event.clientY };
  event.preventDefault();
  ctxMenuCtx.onOpenChange(true);
}

function handlePointerDown(event: PointerEvent) {
  if (disabled || event.button !== 0) return;
  if (event.pointerType !== 'touch') return;
  clearLongPress();
  longPressTimer = setTimeout(() => {
    point.value = { x: event.clientX, y: event.clientY };
    ctxMenuCtx.onOpenChange(true);
  }, LONG_PRESS_DELAY);
}

function handlePointerCancel() {
  clearLongPress();
}

function handlePointerUp() {
  clearLongPress();
}
</script>

<template>
  <MenuAnchor :reference="virtualEl">
    <Primitive
      :ref="forwardRef"
      :as="as"
      :data-state="menuCtx.open.value ? 'open' : 'closed'"
      :data-disabled="disabled ? '' : undefined"
      @contextmenu="handleContextMenu"
      @pointerdown="handlePointerDown"
      @pointercancel="handlePointerCancel"
      @pointerup="handlePointerUp"
    >
      <slot />
    </Primitive>
  </MenuAnchor>
</template>
