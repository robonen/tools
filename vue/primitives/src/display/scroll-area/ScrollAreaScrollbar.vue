<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A custom scrollbar track for one axis. It picks the appropriate visibility strategy from
 * the root's `type` (`auto`, `always`, `scroll`, or `hover`) and renders the matching
 * scrolling behaviour. Render one for each axis you want scrollable and place a
 * `ScrollAreaThumb` inside it.
 */
export interface ScrollAreaScrollbarProps extends PrimitiveProps {
  /** @default 'vertical' */
  orientation?: 'horizontal' | 'vertical';
  /** Keep mounted regardless of visibility state. */
  forceMount?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import ScrollAreaScrollbarAuto from './ScrollAreaScrollbarAuto.vue';
import ScrollAreaScrollbarGlimpse from './ScrollAreaScrollbarGlimpse.vue';
import ScrollAreaScrollbarHover from './ScrollAreaScrollbarHover.vue';
import ScrollAreaScrollbarScroll from './ScrollAreaScrollbarScroll.vue';
import ScrollAreaScrollbarVisible from './ScrollAreaScrollbarVisible.vue';
import { useScrollAreaRootContext } from './context';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<ScrollAreaScrollbarProps>(), {
  orientation: 'vertical',
});

const ctx = useScrollAreaRootContext();
const { forwardRef } = useForwardExpose();
const isHorizontal = computed(() => props.orientation === 'horizontal');

watch(isHorizontal, (h) => {
  if (h)
    ctx.onScrollbarXEnabledChange(true);
  else
    ctx.onScrollbarYEnabledChange(true);
}, { immediate: true });

onBeforeUnmount(() => {
  if (isHorizontal.value)
    ctx.onScrollbarXEnabledChange(false);
  else
    ctx.onScrollbarYEnabledChange(false);
});
</script>

<template>
  <ScrollAreaScrollbarHover
    v-if="ctx.type.value === 'hover'"
    :ref="forwardRef"
    v-bind="$attrs"
    :orientation="orientation"
    :force-mount="forceMount"
    :as="as"
  >
    <slot />
  </ScrollAreaScrollbarHover>
  <ScrollAreaScrollbarScroll
    v-else-if="ctx.type.value === 'scroll'"
    :ref="forwardRef"
    v-bind="$attrs"
    :orientation="orientation"
    :force-mount="forceMount"
    :as="as"
  >
    <slot />
  </ScrollAreaScrollbarScroll>
  <ScrollAreaScrollbarGlimpse
    v-else-if="ctx.type.value === 'glimpse'"
    :ref="forwardRef"
    v-bind="$attrs"
    :orientation="orientation"
    :force-mount="forceMount"
    :as="as"
  >
    <slot />
  </ScrollAreaScrollbarGlimpse>
  <ScrollAreaScrollbarAuto
    v-else-if="ctx.type.value === 'auto'"
    :ref="forwardRef"
    v-bind="$attrs"
    :orientation="orientation"
    :force-mount="forceMount"
    :as="as"
  >
    <slot />
  </ScrollAreaScrollbarAuto>
  <ScrollAreaScrollbarVisible
    v-else
    :ref="forwardRef"
    v-bind="$attrs"
    :orientation="orientation"
    :as="as"
    data-state="visible"
  >
    <slot />
  </ScrollAreaScrollbarVisible>
</template>
