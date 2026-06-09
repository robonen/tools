<script lang="ts">
/**
 * The horizontal (or vertical) list of menu items. Renders a `RovingFocusGroup`
 * inside a positioned wrapper that also serves as the track for `NavigationMenuIndicator`.
 * Place one directly inside `NavigationMenuRoot` (or `NavigationMenuSub`) to hold its
 * `NavigationMenuItem`s.
 */
// This component takes no props of its own (it renders a fixed wrapper + RovingFocusGroup
// and forwards $attrs). The empty interface is the intentional public prop contract.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface NavigationMenuListProps {}
</script>

<script setup lang="ts">
import { onMounted, watch } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { RovingFocusGroup } from '../roving-focus';
import { useNavigationMenuContext } from './context';

defineOptions({ inheritAttrs: false });

defineProps<NavigationMenuListProps>();

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
      as="ul"
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
