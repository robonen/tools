<script lang="ts">
/**
 * An optional visual cue (e.g. an arrow or underline) that tracks the currently active
 * trigger. It teleports into the `NavigationMenuList` wrapper and exposes the active
 * trigger's size and position as CSS variables for animated highlighting.
 */
export interface NavigationMenuIndicatorProps {
  forceMount?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { Presence } from '../presence';
import { Primitive } from '../primitive';
import { useNavigationMenuContext } from './context';

defineOptions({ inheritAttrs: false });

const { forceMount = false } = defineProps<NavigationMenuIndicatorProps>();

const menuContext = useNavigationMenuContext();
const { forwardRef } = useForwardExpose();

const isVisible = computed(() => menuContext.modelValue.value !== '');
const isHorizontal = computed(() => menuContext.orientation === 'horizontal');

const rect = ref<{ size: number; position: number } | undefined>();

let triggerObserver: ResizeObserver | undefined;
let trackObserver: ResizeObserver | undefined;

function recompute() {
  const trigger = menuContext.activeTrigger.value;
  if (!trigger) return;
  if (isHorizontal.value) {
    rect.value = { size: trigger.offsetWidth, position: trigger.offsetLeft };
  }
  else {
    rect.value = { size: trigger.offsetHeight, position: trigger.offsetTop };
  }
}

watch(
  () => [menuContext.activeTrigger.value, menuContext.indicatorTrack.value, isHorizontal.value],
  () => {
    triggerObserver?.disconnect();
    trackObserver?.disconnect();
    const trigger = menuContext.activeTrigger.value;
    const track = menuContext.indicatorTrack.value;
    if (!trigger || !track) return;
    triggerObserver = new ResizeObserver(recompute);
    trackObserver = new ResizeObserver(recompute);
    triggerObserver.observe(trigger);
    trackObserver.observe(track);
    recompute();
  },
  { immediate: true },
);

onScopeDispose(() => {
  triggerObserver?.disconnect();
  trackObserver?.disconnect();
});

const indicatorStyle = computed(() => {
  if (!rect.value) return {};
  return {
    '--primitives-navigation-menu-indicator-size': `${rect.value.size}px`,
    '--primitives-navigation-menu-indicator-position': `${rect.value.position}px`,
  };
});
</script>

<template>
  <Teleport v-if="menuContext.indicatorTrack.value" :to="menuContext.indicatorTrack.value">
    <Presence :present="isVisible" :force-mount="forceMount">
      <Primitive
        :ref="forwardRef"
        :data-state="isVisible ? 'visible' : 'hidden'"
        :data-orientation="menuContext.orientation"
        data-primitives-navigation-menu-indicator
        :style="indicatorStyle"
        v-bind="$attrs"
      >
        <slot />
      </Primitive>
    </Presence>
  </Teleport>
</template>
