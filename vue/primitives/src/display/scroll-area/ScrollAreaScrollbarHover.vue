<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

export interface ScrollAreaScrollbarHoverProps extends PrimitiveProps {
  orientation?: 'horizontal' | 'vertical';
  forceMount?: boolean;
}
</script>

<script setup lang="ts">
import { onScopeDispose, ref } from 'vue';
import { useEventListener, useForwardExpose } from '@robonen/vue';
import { Presence } from '../../utilities/presence';
import ScrollAreaScrollbarAuto from './ScrollAreaScrollbarAuto.vue';
import { useScrollAreaRootContext } from './context';

defineOptions({ inheritAttrs: false });

withDefaults(defineProps<ScrollAreaScrollbarHoverProps>(), {
  orientation: 'vertical',
});

const ctx = useScrollAreaRootContext();
const { forwardRef } = useForwardExpose();
const visible = ref(false);
let hideTimer: ReturnType<typeof setTimeout> | null = null;

function clearTimer() {
  if (hideTimer !== null) {
    globalThis.clearTimeout(hideTimer);
    hideTimer = null;
  }
}

function onEnter() {
  clearTimer();
  visible.value = true;
}
function onLeave() {
  clearTimer();
  hideTimer = globalThis.setTimeout(() => {
    visible.value = false;
  }, ctx.scrollHideDelay.value);
}

// Re-attaches automatically when the scroll-area element changes; SSR-safe
// (the getter resolves to `undefined` on the server).
useEventListener(() => ctx.scrollArea.value, 'pointerenter', onEnter);
useEventListener(() => ctx.scrollArea.value, 'pointerleave', onLeave);

onScopeDispose(clearTimer);
</script>

<template>
  <Presence :present="forceMount || visible">
    <ScrollAreaScrollbarAuto
      :ref="forwardRef"
      v-bind="$attrs"
      :orientation="orientation"
      :as="as"
      :data-state="visible ? 'visible' : 'hidden'"
      force-mount
    >
      <slot />
    </ScrollAreaScrollbarAuto>
  </Presence>
</template>
