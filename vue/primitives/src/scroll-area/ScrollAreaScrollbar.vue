<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface ScrollAreaScrollbarProps extends PrimitiveProps {
  /** @default 'vertical' */
  orientation?: 'horizontal' | 'vertical';
  /** Keep mounted regardless of visibility state. */
  forceMount?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue';
import ScrollAreaScrollbarAuto from './ScrollAreaScrollbarAuto.vue';
import ScrollAreaScrollbarHover from './ScrollAreaScrollbarHover.vue';
import ScrollAreaScrollbarScroll from './ScrollAreaScrollbarScroll.vue';
import ScrollAreaScrollbarVisible from './ScrollAreaScrollbarVisible.vue';
import { useScrollAreaRootContext } from './context';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<ScrollAreaScrollbarProps>(), {
  orientation: 'vertical',
});

const ctx = useScrollAreaRootContext();
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
    v-bind="$attrs"
    :orientation="orientation"
    :force-mount="forceMount"
    :as="as"
  >
    <slot />
  </ScrollAreaScrollbarHover>
  <ScrollAreaScrollbarScroll
    v-else-if="ctx.type.value === 'scroll'"
    v-bind="$attrs"
    :orientation="orientation"
    :force-mount="forceMount"
    :as="as"
  >
    <slot />
  </ScrollAreaScrollbarScroll>
  <ScrollAreaScrollbarAuto
    v-else-if="ctx.type.value === 'auto'"
    v-bind="$attrs"
    :orientation="orientation"
    :force-mount="forceMount"
    :as="as"
  >
    <slot />
  </ScrollAreaScrollbarAuto>
  <ScrollAreaScrollbarVisible
    v-else
    v-bind="$attrs"
    :orientation="orientation"
    :as="as"
    data-state="visible"
  >
    <slot />
  </ScrollAreaScrollbarVisible>
</template>
