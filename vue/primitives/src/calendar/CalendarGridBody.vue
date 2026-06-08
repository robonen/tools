<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface CalendarGridBodyProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';

const { as = 'tbody' } = defineProps<CalendarGridBodyProps>();
</script>

<template>
  <Primitive :as="as" :data-primitives-calendar-grid-body="''">
    <slot />
  </Primitive>
</template>
