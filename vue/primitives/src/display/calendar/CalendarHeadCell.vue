<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A `scope="col"` weekday header cell (`<th>`). Renders the localized short
 * label in its slot while exposing the full weekday name as the `aria-label`
 * when a `day` is provided.
 */
export interface CalendarHeadCellProps extends PrimitiveProps {
  /** The day this header cell represents — used for `aria-label`. */
  day?: Date;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { Primitive } from '../../internal/primitive';
import { useCalendarRootContext } from './context';

const { as = 'th', day } = defineProps<CalendarHeadCellProps>();

const ctx = useCalendarRootContext();
const adapter = ctx.dateAdapter;
const longLabel = computed(() => (day ? adapter.value.formatWeekday(day, ctx.locale.value, 'long') : undefined));
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
