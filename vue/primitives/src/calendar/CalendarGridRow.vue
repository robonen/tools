<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface CalendarGridRowProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';

const { as = 'tr' } = defineProps<CalendarGridRowProps>();
</script>

<template>
  <Primitive :as="as" :data-primitives-calendar-grid-row="''">
    <slot />
  </Primitive>
</template>
