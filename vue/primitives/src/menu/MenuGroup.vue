<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * Groups a set of related menu items under `role="group"` for accessibility.
 * Combine it with a MenuLabel to give the group an accessible name.
 */
export interface MenuGroupProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { useId } from '../config-provider';
import { Primitive } from '../primitive';
import { provideMenuGroupContext } from './context';

const { as = 'div' } = defineProps<MenuGroupProps>();
const id = useId(undefined, 'menu-group');
provideMenuGroupContext({ id: id.value });
</script>

<template>
  <Primitive :as="as" role="group" :id="id">
    <slot />
  </Primitive>
</template>
