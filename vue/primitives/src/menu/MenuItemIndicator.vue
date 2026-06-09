<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * Renders only while its parent MenuCheckboxItem or MenuRadioItem is checked (or
 * indeterminate), giving you a place to show a check or dot icon. Must be nested
 * inside a checkbox or radio item, which provides its state via context.
 */
export interface MenuItemIndicatorProps extends PrimitiveProps {
  /** Force mounting the indicator even when unchecked, e.g. to control presence with an external animation library. */
  forceMount?: boolean;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';

import { Presence } from '../presence';
import { Primitive } from '../primitive';
import { useMenuItemIndicatorContext } from './context';
import { getCheckedState, isIndeterminate } from './utils';

const { as = 'span', forceMount = false } = defineProps<MenuItemIndicatorProps>();
const ctx = useMenuItemIndicatorContext();
const isPresent = computed(() => ctx.checkedState.value === true || isIndeterminate(ctx.checkedState.value));
</script>

<template>
  <Presence :present="forceMount || isPresent">
    <Primitive
      :as="as"
      :data-state="getCheckedState(ctx.checkedState.value)"
    >
      <slot />
    </Primitive>
  </Presence>
</template>
