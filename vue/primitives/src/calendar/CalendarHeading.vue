<script lang="ts">
import type { PrimitiveProps } from '../primitive';

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
