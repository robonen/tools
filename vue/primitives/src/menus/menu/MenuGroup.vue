<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * Groups a set of related menu items under `role="group"` for accessibility.
 * Combine it with a MenuLabel to give the group an accessible name.
 */
export interface MenuGroupProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { useId } from '../../utilities/config-provider';
import { Primitive } from '../../internal/primitive';
import { provideMenuGroupContext } from './context';

const { as = 'div' } = defineProps<MenuGroupProps>();
const id = useId(undefined, 'menu-group');
provideMenuGroupContext({ id: id.value });
</script>

<template>
  <Primitive :as="as" role="group" :aria-labelledby="id">
    <slot />
  </Primitive>
</template>
