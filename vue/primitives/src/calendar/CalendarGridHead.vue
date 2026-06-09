<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * The grid's `<thead>` wrapper holding the row of weekday `CalendarHeadCell`
 * labels.
 */
export interface CalendarGridHeadProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';

const { as = 'thead' } = defineProps<CalendarGridHeadProps>();
</script>

<template>
  <Primitive :as="as" :data-primitives-calendar-grid-head="''">
    <slot />
  </Primitive>
</template>
