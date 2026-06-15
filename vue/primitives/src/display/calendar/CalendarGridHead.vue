<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The grid's `<thead>` wrapper holding the row of weekday `CalendarHeadCell`
 * labels. Marked `aria-hidden` since each day cell already carries its full
 * accessible label, avoiding a double weekday-column announcement.
 */
export interface CalendarGridHeadProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../../internal/primitive';

const { as = 'thead' } = defineProps<CalendarGridHeadProps>();
</script>

<template>
  <Primitive :as="as" aria-hidden="true" :data-primitives-calendar-grid-head="''">
    <slot />
  </Primitive>
</template>
