<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A hybrid visibility strategy used for `type='glimpse'`: scrollbars briefly
 * reveal themselves when the pointer enters the scroll area, then auto-hide
 * after `scrollHideDelay`, and behave like `type='scroll'` once the user
 * actually scrolls or interacts with the bar.
 */
export interface ScrollAreaScrollbarGlimpseProps extends PrimitiveProps {
  orientation?: 'horizontal' | 'vertical';
  forceMount?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onScopeDispose, onWatcherCleanup, ref, watch, watchEffect } from 'vue';
import { debounce } from '@robonen/stdlib';
import { useEventListener, useForwardExpose } from '@robonen/vue';
import { Presence } from '../../utilities/presence';
import ScrollAreaScrollbarAuto from './ScrollAreaScrollbarAuto.vue';
import { useScrollAreaRootContext } from './context';
import { addUnlinkedScrollListener } from './utils';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<ScrollAreaScrollbarGlimpseProps>(), {
  orientation: 'vertical',
});

const ctx = useScrollAreaRootContext();
const { forwardRef } = useForwardExpose();

type GlimpseState = 'hidden' | 'glimpse' | 'scrolling' | 'interacting' | 'idle';
type GlimpseEvent = 'POINTER_ENTER' | 'POINTER_LEAVE' | 'SCROLL' | 'SCROLL_END' | 'HIDE';

/**
 * Declarative transition table — keeps the visibility lifecycle flat instead
 * of branching inline. Unknown events for a state are a no-op.
 */
const TRANSITIONS: Record<GlimpseState, Partial<Record<GlimpseEvent, GlimpseState>>> = {
  hidden: { POINTER_ENTER: 'glimpse', SCROLL: 'scrolling' },
  glimpse: { HIDE: 'hidden', POINTER_LEAVE: 'hidden', SCROLL: 'scrolling', POINTER_ENTER: 'glimpse' },
  scrolling: { SCROLL_END: 'idle', POINTER_ENTER: 'interacting' },
  interacting: { SCROLL: 'interacting', POINTER_LEAVE: 'idle' },
  idle: { HIDE: 'hidden', SCROLL: 'scrolling', POINTER_ENTER: 'interacting' },
};

const state = ref<GlimpseState>('hidden');
const isHorizontal = computed(() => props.orientation === 'horizontal');
const visible = computed(() => state.value !== 'hidden');

function dispatch(event: GlimpseEvent) {
  const next = TRANSITIONS[state.value][event];
  if (next)
    state.value = next;
}

const debouncedScrollEnd = debounce(() => dispatch('SCROLL_END'), 100);

function onEnter() {
  dispatch('POINTER_ENTER');
}
function onLeave() {
  dispatch('POINTER_LEAVE');
}

// Auto-hide after the delay while glimpsing or idle.
watchEffect(() => {
  if (state.value === 'glimpse' || state.value === 'idle') {
    const id = globalThis.setTimeout(() => dispatch('HIDE'), ctx.scrollHideDelay.value);
    onWatcherCleanup(() => globalThis.clearTimeout(id));
  }
});

let stop: (() => void) | null = null;
let last = { left: 0, top: 0 };

function attachScroll() {
  stop?.();
  const vp = ctx.viewport.value;
  if (!vp)
    return;
  last = { left: vp.scrollLeft, top: vp.scrollTop };
  stop = addUnlinkedScrollListener(vp, () => {
    const next = { left: vp.scrollLeft, top: vp.scrollTop };
    const matches = isHorizontal.value ? last.left !== next.left : last.top !== next.top;
    if (matches) {
      dispatch('SCROLL');
      debouncedScrollEnd();
    }
    last = next;
  });
}

// Re-attaches automatically when the scroll-area element changes; SSR-safe
// (the getter resolves to `undefined` on the server).
useEventListener(() => ctx.scrollArea.value, 'pointerenter', onEnter);
useEventListener(() => ctx.scrollArea.value, 'pointerleave', onLeave);

watch(() => ctx.viewport.value, attachScroll, { immediate: true });

onScopeDispose(() => {
  stop?.();
  debouncedScrollEnd.cancel();
});
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
