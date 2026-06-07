<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface MenuSeparatorProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';

const { as = 'div' } = defineProps<MenuSeparatorProps>();
</script>

<template>
  <Primitive :as="as" role="separator" aria-orientation="horizontal">
    <slot />
  </Primitive>
</template>
