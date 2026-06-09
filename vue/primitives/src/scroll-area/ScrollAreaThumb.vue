<script lang="ts">
import type { PrimitiveProps } from '../primitive';
</script>

<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref, watch } from 'vue';
import { Presence } from '../presence';
import { Primitive } from '../primitive';
import { useForwardExpose } from '@robonen/vue';
import { useScrollAreaRootContext, useScrollAreaScrollbarContext } from './context';
import { addUnlinkedScrollListener } from './utils';

/**
 * The draggable handle inside a `ScrollAreaScrollbar`. Its size and position track the
 * scroll offset, and dragging it scrolls the viewport. Must be rendered inside a
 * `ScrollAreaScrollbar`.
 */
export interface ScrollAreaThumbProps extends PrimitiveProps {
  /** Keep mounted regardless of `hasThumb`. */
  forceMount?: boolean;
}

defineOptions({ inheritAttrs: false });

const props = defineProps<ScrollAreaThumbProps>();
const root = useScrollAreaRootContext();
const sb = useScrollAreaScrollbarContext();

const removeUnlinkedScrollListenerRef = ref<(() => void) | null>(null);
const { forwardRef, currentElement } = useForwardExpose();

function handlePointerDown(event: PointerEvent) {
  const target = event.target as HTMLElement;
  const rect = target.getBoundingClientRect();
  sb.onThumbPointerDown({ x: event.clientX - rect.left, y: event.clientY - rect.top });
}

function handlePointerUp() {
  sb.onThumbPointerUp();
}

function attachScroll() {
  removeUnlinkedScrollListenerRef.value?.();
  const vp = root.viewport.value;
  if (!vp)
    return;
  sb.onThumbPositionChange();
  removeUnlinkedScrollListenerRef.value = addUnlinkedScrollListener(vp, () => {
    sb.onThumbPositionChange();
  });
}

onMounted(() => {
  attachScroll();
  if (currentElement.value)
    sb.onThumbChange(currentElement.value);
});

watch(currentElement, el => sb.onThumbChange(el ?? null));
watch(() => root.viewport.value, attachScroll);
watch(() => sb.hasThumb.value, () => {
  sb.onThumbPositionChange();
});

onScopeDispose(() => {
  removeUnlinkedScrollListenerRef.value?.();
  sb.onThumbChange(null);
});

const present = computed(() => props.forceMount || sb.hasThumb.value);
</script>

<template>
  <Presence :present="present">
    <Primitive
      :ref="forwardRef"
      :as="as ?? 'div'"
      data-state="visible"
      :style="{ width: 'var(--scroll-area-thumb-width)', height: 'var(--scroll-area-thumb-height)' }"
      v-bind="$attrs"
      @pointerdowncapture="handlePointerDown"
      @pointerup="handlePointerUp"
    >
      <slot />
    </Primitive>
  </Presence>
</template>
