<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface MenuLabelProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';

const { as = 'div' } = defineProps<MenuLabelProps>();
</script>

<template>
  <Primitive :as="as">
    <slot />
  </Primitive>
</template>
