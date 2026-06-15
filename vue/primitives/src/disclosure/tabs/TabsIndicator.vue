<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * An optional visual cue (e.g. an underline or pill) that tracks the currently
 * active trigger. Render it inside `TabsList`; it exposes the active tab's size
 * and position as CSS variables (`--primitives-tabs-indicator-size` /
 * `--primitives-tabs-indicator-position`) so consumers can animate a highlight
 * purely from CSS.
 */
export interface TabsIndicatorProps extends PrimitiveProps {
}
</script>

<script setup lang="ts">
import { computed, onScopeDispose, shallowRef, watch } from 'vue';
import { useForwardExpose, useMounted } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { useTabsContext } from './context';

const { as = 'span' } = defineProps<TabsIndicatorProps>();

const ctx = useTabsContext();

const isHorizontal = computed(() => ctx.orientation.value === 'horizontal');
const isMounted = useMounted();

const rect = shallowRef<{ size: number; position: number }>();

function activeTab(): HTMLElement | null {
  const list = ctx.tabsListElement.value;
  if (!list) return null;
  return list.querySelector<HTMLElement>('[role="tab"][data-state="active"]');
}

function updateIndicatorStyle(): void {
  const tab = activeTab();
  if (!tab) {
    rect.value = undefined;
    return;
  }
  rect.value = isHorizontal.value
    ? { size: tab.offsetWidth, position: tab.offsetLeft }
    : { size: tab.offsetHeight, position: tab.offsetTop };
}

defineExpose({ updateIndicatorStyle });

// `useForwardExpose` runs AFTER `defineExpose` so the composable merges the
// prior expose bindings (plus props + `$el`) instead of `defineExpose`'s
// `expose()` clobbering them and warning "expose() should be called only once".
const { forwardRef } = useForwardExpose();

let listObserver: ResizeObserver | undefined;

watch(
  () => [ctx.value.value, ctx.tabsListElement.value, ctx.direction.value, isHorizontal.value],
  () => {
    listObserver?.disconnect();
    const list = ctx.tabsListElement.value;
    if (!list) return;
    listObserver = new ResizeObserver(updateIndicatorStyle);
    listObserver.observe(list);
    for (const tab of list.querySelectorAll<HTMLElement>('[role="tab"]')) {
      listObserver.observe(tab);
    }
    updateIndicatorStyle();
  },
  { immediate: true, flush: 'post' },
);

onScopeDispose(() => {
  listObserver?.disconnect();
});

const indicatorStyle = computed(() => {
  if (!rect.value) return undefined;
  return {
    '--primitives-tabs-indicator-size': `${rect.value.size}px`,
    '--primitives-tabs-indicator-position': `${rect.value.position}px`,
  };
});
</script>

<template>
  <Primitive
    v-if="isMounted && rect"
    :ref="forwardRef"
    :as="as"
    :data-state="ctx.value.value !== undefined ? 'active' : 'inactive'"
    :data-orientation="ctx.orientation.value"
    data-primitives-tabs-indicator
    :style="indicatorStyle"
  >
    <slot />
  </Primitive>
</template>
