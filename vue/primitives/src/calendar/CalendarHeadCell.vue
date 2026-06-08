<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface CalendarHeadCellProps extends PrimitiveProps {
  /** The day this header cell represents — used for `aria-label`. */
  day?: Date;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { Primitive } from '../primitive';
import { useCalendarRootContext } from './context';
import { formatWeekday } from './utils';

const { as = 'th', day } = defineProps<CalendarHeadCellProps>();

const ctx = useCalendarRootContext();
const longLabel = computed(() => (day ? formatWeekday(day, ctx.locale.value, 'long') : undefined));
</script>

<template>
  <Primitive
    :as="as"
    scope="col"
    :aria-label="longLabel"
    :data-primitives-calendar-head-cell="''"
  >
    <slot />
  </Primitive>
</template>
