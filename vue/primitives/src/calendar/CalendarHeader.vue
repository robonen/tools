<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * Layout container for the calendar's top bar. Holds the `CalendarPrev`,
 * `CalendarHeading`, and `CalendarNext` controls above the month grid(s).
 */
export interface CalendarHeaderProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';

const { as = 'div' } = defineProps<CalendarHeaderProps>();
</script>

<template>
  <Primitive :as="as" :data-primitives-calendar-header="''">
    <slot />
  </Primitive>
</template>
