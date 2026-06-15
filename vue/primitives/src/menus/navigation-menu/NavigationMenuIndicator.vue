<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * An optional visual cue (e.g. an arrow or underline) that tracks the currently active
 * trigger. It teleports into the `NavigationMenuList` wrapper and exposes the active
 * trigger's size and position as CSS variables for animated highlighting.
 */
export interface NavigationMenuIndicatorProps extends PrimitiveProps {
  forceMount?: boolean;
}
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { useForwardExpose, useResizeObserver } from '@robonen/vue';
import { Presence } from '../../utilities/presence';
import { Primitive } from '../../internal/primitive';
import { useNavigationMenuContext } from './context';

defineOptions({ inheritAttrs: false });

const { forceMount = false, as = 'div' } = defineProps<NavigationMenuIndicatorProps>();

const menuContext = useNavigationMenuContext();
const { forwardRef } = useForwardExpose();

const isVisible = computed(() => menuContext.modelValue.value !== '');
const isHorizontal = computed(() => menuContext.orientation === 'horizontal');

const rect = ref<{ size: number; position: number } | undefined>();

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

// Re-measure on resize of the active trigger or the track. The observer
// re-targets automatically as those elements change and tears down on dispose.
useResizeObserver(
  [() => menuContext.activeTrigger.value, () => menuContext.indicatorTrack.value],
  recompute,
);

// Re-measure on trigger/track swap and orientation change (non-resize triggers).
watch(
  () => [menuContext.activeTrigger.value, menuContext.indicatorTrack.value, isHorizontal.value],
  recompute,
  { immediate: true },
);

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
        :as="as"
        aria-hidden="true"
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
