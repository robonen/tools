<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface MenuSeparatorProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';

const { as = 'div', asChild } = defineProps<MenuSeparatorProps>();
</script>

<template>
  <Primitive :as="as" :as-child="asChild" role="separator" aria-orientation="horizontal">
    <slot />
  </Primitive>
</template>
