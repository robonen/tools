<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface MenuLabelProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';

const { as = 'div', asChild } = defineProps<MenuLabelProps>();
</script>

<template>
  <Primitive :as="as" :as-child="asChild">
    <slot />
  </Primitive>
</template>
