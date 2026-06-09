<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * A single table row (`<tr>`) representing one week of the month, or the
 * weekday-label row inside the grid head.
 */
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
