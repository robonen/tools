<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';
import type { ScrollAreaType } from './types';

/**
 * Provides a styleable, cross-browser scroll container that swaps native scrollbars for
 * custom ones while preserving native scrolling, keyboard, and accessibility behaviour.
 * The root holds shared state and renders nothing visible on its own — compose it with a
 * `ScrollAreaViewport` (the scrollable region), one or two `ScrollAreaScrollbar`s (each
 * containing a `ScrollAreaThumb`), and an optional `ScrollAreaCorner`. Reach for it when
 * the default OS scrollbars clash with your design or differ across platforms.
 */
export interface ScrollAreaRootProps extends PrimitiveProps {
  /**
   * Visibility behaviour for scrollbars.
   * - `auto`: visible whenever content overflows.
   * - `always`: always visible.
   * - `scroll`: visible while the user is scrolling, then hides after `scrollHideDelay`.
   * - `hover`: visible while the pointer is over the root, then hides after `scrollHideDelay`.
   * - `glimpse`: briefly revealed when the pointer enters the root, then auto-hides;
   *   behaves like `scroll` once the user scrolls or interacts with the bar.
   * @default 'hover'
   */
  type?: ScrollAreaType;
  /** Reading direction. Inherits from `ConfigProvider` when omitted. */
  dir?: 'ltr' | 'rtl';
  /**
   * For `type='scroll'` and `type='hover'`, the time in ms before scrollbars hide
   * after the user stops interacting.
   * @default 600
   */
  scrollHideDelay?: number;
}
</script>

<script setup lang="ts">
import { computed, ref, shallowRef, toRef } from 'vue';
import { Primitive } from '../../internal/primitive';
import { provideScrollAreaRootContext } from './context';
import { useConfig, useId } from '../../utilities/config-provider';
import { useForwardExpose } from '@robonen/vue';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<ScrollAreaRootProps>(), {
  type: 'hover',
  scrollHideDelay: 600,
});

const config = useConfig();

const viewport = shallowRef<HTMLElement | null>(null);
const content = shallowRef<HTMLElement | null>(null);
const scrollbarX = shallowRef<HTMLElement | null>(null);
const scrollbarY = shallowRef<HTMLElement | null>(null);
const scrollbarXEnabled = ref(false);
const scrollbarYEnabled = ref(false);
const cornerWidth = ref(0);
const cornerHeight = ref(0);
const viewportId = useId(undefined, 'scroll-area-viewport');

const dir = computed(() => props.dir ?? config.dir.value);

// `defineExpose` runs BEFORE `useForwardExpose` so the composable merges these
// bindings (plus props + `$el`) instead of `defineExpose`'s `expose()`
// clobbering them and warning "expose() should be called only once". Unlike the
// other roots, `useForwardExpose` must stay above the provide below because
// `scrollArea` (its `currentElement`) feeds the context.
defineExpose({
  viewport,
  scrollTop: () => viewport.value?.scrollTo({ top: 0 }),
  scrollTopLeft: () => viewport.value?.scrollTo({ top: 0, left: 0 }),
});

const { forwardRef, currentElement: scrollArea } = useForwardExpose();

provideScrollAreaRootContext({
  type: toRef(props, 'type'),
  dir,
  scrollHideDelay: toRef(props, 'scrollHideDelay'),
  scrollArea,
  viewport,
  content,
  scrollbarX,
  scrollbarY,
  scrollbarXEnabled,
  scrollbarYEnabled,
  cornerWidth,
  cornerHeight,
  viewportId,
  onScrollbarXEnabledChange: (v) => { scrollbarXEnabled.value = v; },
  onScrollbarYEnabledChange: (v) => { scrollbarYEnabled.value = v; },
  onScrollbarXChange: (el) => { scrollbarX.value = el; },
  onScrollbarYChange: (el) => { scrollbarY.value = el; },
  onCornerWidthChange: (n) => { cornerWidth.value = n; },
  onCornerHeightChange: (n) => { cornerHeight.value = n; },
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :dir="dir"
    :style="{
      position: 'relative',
      '--scroll-area-corner-width': `${cornerWidth}px`,
      '--scroll-area-corner-height': `${cornerHeight}px`,
    }"
    v-bind="$attrs"
  >
    <slot />
  </Primitive>
</template>
