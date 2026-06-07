<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface ScrollAreaScrollbarScrollProps extends PrimitiveProps {
  orientation?: 'horizontal' | 'vertical';
  forceMount?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref, watch } from 'vue';
import { Presence } from '../presence';
import { useScrollAreaRootContext } from './context';
import ScrollAreaScrollbarVisible from './ScrollAreaScrollbarVisible.vue';
import { addUnlinkedScrollListener, debounceCallback } from './utils';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<ScrollAreaScrollbarScrollProps>(), {
  orientation: 'vertical',
});

const ctx = useScrollAreaRootContext();
const isHorizontal = computed(() => props.orientation === 'horizontal');
const state = ref<'hidden' | 'scrolling' | 'interacting' | 'idle'>('hidden');

const debouncedScrollEnd = debounceCallback(() => {
  state.value = 'idle';
}, 100);

const debouncedHide = debounceCallback(() => {
  state.value = 'hidden';
}, ctx.scrollHideDelay.value);

watch(state, (s, prev) => {
  if (s === 'idle')
    debouncedHide();
  if (s !== 'idle' && prev === 'idle')
    debouncedHide.cancel();
});

let last = { left: 0, top: 0 };
let stop: (() => void) | null = null;

function attach() {
  stop?.();
  const vp = ctx.viewport.value;
  if (!vp)
    return;
  last = { left: vp.scrollLeft, top: vp.scrollTop };
  stop = addUnlinkedScrollListener(vp, () => {
    const next = { left: vp.scrollLeft, top: vp.scrollTop };
    const horiz = last.left !== next.left;
    const vert = last.top !== next.top;
    const matches = isHorizontal.value ? horiz : vert;
    if (matches) {
      state.value = 'scrolling';
      debouncedScrollEnd();
    }
    last = next;
  });
}

onMounted(attach);
watch(() => ctx.viewport.value, attach);
onScopeDispose(() => {
  stop?.();
  debouncedScrollEnd.cancel();
  debouncedHide.cancel();
});

const isVisible = computed(() => state.value !== 'hidden');
</script>

<template>
  <Presence :present="forceMount || isVisible">
    <ScrollAreaScrollbarVisible
      v-bind="$attrs"
      :orientation="orientation"
      :as="as"
      :data-state="isVisible ? 'visible' : 'hidden'"
      @pointerenter="state = 'interacting'"
      @pointerleave="state = 'idle'"
    >
      <slot />
    </ScrollAreaScrollbarVisible>
  </Presence>
</template>
