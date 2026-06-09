<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * Displays the currently visible month and year (e.g. "June 2026"), or a range
 * when multiple months are shown. Marked `aria-hidden` since the grid already
 * carries the full accessible label; expose the value via its default slot to
 * customize the rendering.
 */
export interface CalendarHeadingProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { useCalendarRootContext } from './context';

const { as = 'div' } = defineProps<CalendarHeadingProps>();

defineSlots<{
  default?: (props: { headingValue: string }) => unknown;
}>();

const ctx = useCalendarRootContext();
</script>

<template>
  <Primitive
    :as="as"
    aria-hidden="true"
    :data-primitives-calendar-heading="''"
    :data-disabled="ctx.disabled.value ? '' : undefined"
  >
    <slot :heading-value="ctx.headingValue.value">
      {{ ctx.headingValue.value }}
    </slot>
  </Primitive>
</template>
