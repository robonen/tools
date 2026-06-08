<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface MenuItemIndicatorProps extends PrimitiveProps {
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
