<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface TooltipTriggerProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useTooltipContext, useTooltipProviderContext } from './context';
import { PopperAnchor } from '../popper';
import { Primitive } from '../primitive';
import { useForwardExpose } from '@robonen/vue';

const { as = 'button' } = defineProps<TooltipTriggerProps>();

const ctx = useTooltipContext();
const providerCtx = useTooltipProviderContext();
const { forwardRef, currentElement } = useForwardExpose();

const isPointerDown = ref(false);
const hasPointerMoveOpened = ref(false);

onMounted(() => {
  ctx.onTriggerChange(currentElement.value);
});

function onPointerMove(event: PointerEvent) {
  if (ctx.disabled.value) return;
  if (event.pointerType === 'touch') return;
  if (hasPointerMoveOpened.value || providerCtx.isPointerInTransitRef.value) return;
  ctx.onTriggerEnter();
  hasPointerMoveOpened.value = true;
}

function onPointerLeave() {
  if (ctx.disabled.value) return;
  ctx.onTriggerLeave();
  hasPointerMoveOpened.value = false;
}

function onPointerUp() {
  // Defer reset by one tick so `focus` handlers can see the latest `isPointerDown`.
  setTimeout(() => {
    isPointerDown.value = false;
  }, 1);
}

function onPointerDown() {
  if (ctx.disabled.value) return;
  if (ctx.open.value && !ctx.disableClosingTrigger.value) ctx.onClose();
  isPointerDown.value = true;
  document.addEventListener('pointerup', onPointerUp, { once: true });
}

function onFocus(event: FocusEvent) {
  if (ctx.disabled.value) return;
  if (isPointerDown.value) return;
  if (
    ctx.ignoreNonKeyboardFocus.value
    && !(event.target as HTMLElement | null)?.matches?.(':focus-visible')
  ) return;
  ctx.onOpen();
}

function onBlur() {
  if (ctx.disabled.value) return;
  ctx.onClose();
}

function onClick() {
  if (ctx.disabled.value) return;
  if (!ctx.disableClosingTrigger.value) ctx.onClose();
}
</script>

<template>
  <PopperAnchor as="template">
    <Primitive
      :ref="forwardRef"
      :as="as"
      :type="as === 'button' ? 'button' : undefined"
      :aria-describedby="ctx.open.value ? ctx.contentId.value : undefined"
      :data-state="ctx.stateAttribute.value"
      data-tooltip-trigger
      @pointermove="onPointerMove"
      @pointerleave="onPointerLeave"
      @pointerdown="onPointerDown"
      @focus="onFocus"
      @blur="onBlur"
      @click="onClick"
    >
      <slot />
    </Primitive>
  </PopperAnchor>
</template>
