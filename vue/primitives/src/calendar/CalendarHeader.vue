<script lang="ts">
import type { PrimitiveProps } from '../primitive';

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
