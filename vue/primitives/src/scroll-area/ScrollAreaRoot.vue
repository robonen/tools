<script lang="ts">
import type { PrimitiveProps } from '../primitive';
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
import { computed, ref, toRef } from 'vue';
import { Primitive } from '../primitive';
import { provideScrollAreaRootContext } from './context';
import { useConfig, useId } from '../config-provider';
import { useForwardExpose } from '@robonen/vue';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<ScrollAreaRootProps>(), {
  type: 'hover',
  scrollHideDelay: 600,
});

const config = useConfig();

const viewport = ref<HTMLElement | null>(null);
const content = ref<HTMLElement | null>(null);
const scrollbarX = ref<HTMLElement | null>(null);
const scrollbarY = ref<HTMLElement | null>(null);
const scrollbarXEnabled = ref(false);
const scrollbarYEnabled = ref(false);
const cornerWidth = ref(0);
const cornerHeight = ref(0);
const viewportId = useId(undefined, 'scroll-area-viewport');

const dir = computed(() => props.dir ?? config.dir.value);

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
  onCornerWidthChange: (n) => { cornerWidth.value = n; },
  onCornerHeightChange: (n) => { cornerHeight.value = n; },
});

defineExpose({
  viewport,
  scrollTop: () => viewport.value?.scrollTo({ top: 0 }),
  scrollTopLeft: () => viewport.value?.scrollTo({ top: 0, left: 0 }),
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
