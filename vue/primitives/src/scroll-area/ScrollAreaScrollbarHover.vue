<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface ScrollAreaScrollbarHoverProps extends PrimitiveProps {
  orientation?: 'horizontal' | 'vertical';
  forceMount?: boolean;
}
</script>

<script setup lang="ts">
import { onScopeDispose, ref, watch } from 'vue';
import { Presence } from '../presence';
import ScrollAreaScrollbarAuto from './ScrollAreaScrollbarAuto.vue';
import { useScrollAreaRootContext } from './context';

defineOptions({ inheritAttrs: false });

withDefaults(defineProps<ScrollAreaScrollbarHoverProps>(), {
  orientation: 'vertical',
});

const ctx = useScrollAreaRootContext();
const visible = ref(false);
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let scrollArea: HTMLElement | null = null;

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

function attach(el: HTMLElement | null) {
  detach();
  if (!el)
    return;
  scrollArea = el;
  el.addEventListener('pointerenter', onEnter);
  el.addEventListener('pointerleave', onLeave);
}
function detach() {
  if (!scrollArea)
    return;
  scrollArea.removeEventListener('pointerenter', onEnter);
  scrollArea.removeEventListener('pointerleave', onLeave);
  scrollArea = null;
}

watch(() => ctx.scrollArea.value, attach, { immediate: true });
onScopeDispose(() => {
  clearTimer();
  detach();
});
</script>

<template>
  <Presence :present="forceMount || visible">
    <ScrollAreaScrollbarAuto
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
