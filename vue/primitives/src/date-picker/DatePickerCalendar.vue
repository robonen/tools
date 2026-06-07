<script lang="ts">
import type { PrimitiveProps } from '../primitive';

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
