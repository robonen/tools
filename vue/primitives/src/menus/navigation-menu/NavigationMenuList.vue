<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The horizontal (or vertical) list of menu items. Renders a `RovingFocusGroup`
 * inside a positioned wrapper that also serves as the track for `NavigationMenuIndicator`.
 * Place one directly inside `NavigationMenuRoot` (or `NavigationMenuSub`) to hold its
 * `NavigationMenuItem`s.
 */
export interface NavigationMenuListProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { onMounted, watch } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { RovingFocusGroup } from '../../utilities/roving-focus';
import { useNavigationMenuContext } from './context';

defineOptions({ inheritAttrs: false });

const { as = 'ul' } = defineProps<NavigationMenuListProps>();

const menuContext = useNavigationMenuContext();
const { forwardRef, currentElement } = useForwardExpose();

onMounted(() => {
  menuContext.onIndicatorTrackChange(currentElement.value);
});

watch(currentElement, (el) => {
  menuContext.onIndicatorTrackChange(el);
});
</script>

<template>
  <div :ref="forwardRef" data-primitives-navigation-menu-list-wrapper style="position: relative">
    <RovingFocusGroup
      v-bind="$attrs"
      :as="as"
      :orientation="menuContext.orientation"
      :dir="menuContext.dir.value"
      :loop="false"
      :data-orientation="menuContext.orientation"
      data-primitives-navigation-menu-list
    >
      <slot />
    </RovingFocusGroup>
  </div>
</template>
