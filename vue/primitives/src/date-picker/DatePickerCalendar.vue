<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * A styling wrapper for the calendar grid rendered inside the popover. The
 * calendar subparts (`DatePickerGrid`, `DatePickerCell`, etc.) consume the
 * calendar context provided by `DatePickerRoot`; this element just groups and
 * labels them with a `data-primitives-date-picker-calendar` hook.
 */
export interface DatePickerCalendarProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';

const { as = 'div' } = defineProps<DatePickerCalendarProps>();
</script>

<template>
  <Primitive :as="as" :data-primitives-date-picker-calendar="''">
    <slot />
  </Primitive>
</template>
