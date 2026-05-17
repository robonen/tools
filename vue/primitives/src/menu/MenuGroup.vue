<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface MenuGroupProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { useId } from '../config-provider';
import { Primitive } from '../primitive';
import { provideMenuGroupContext } from './context';

const { as = 'div', asChild } = defineProps<MenuGroupProps>();
const id = useId(undefined, 'menu-group');
provideMenuGroupContext({ id: id.value });
</script>

<template>
  <Primitive :as="as" :as-child="asChild" role="group" :id="id">
    <slot />
  </Primitive>
</template>
