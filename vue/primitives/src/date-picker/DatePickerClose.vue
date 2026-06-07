<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface DatePickerCloseProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { useDatePickerRootContext } from './context';

const { as = 'button' } = defineProps<DatePickerCloseProps>();

const ctx = useDatePickerRootContext();
</script>

<template>
  <Primitive
    :as="as"
    :type="as === 'button' ? 'button' : undefined"
    :data-state="ctx.open.value ? 'open' : 'closed'"
    @click="ctx.onOpenChange(false)"
  >
    <slot />
  </Primitive>
</template>
