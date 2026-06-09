<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * A button that decreases the value by one `step` when clicked. Rendered as a
 * `<button>` by default and hidden from assistive tech (`aria-hidden`, removed
 * from the tab order) since the input itself is the accessible spinbutton; it
 * is disabled whenever the root is `disabled` or `readonly`.
 */
export interface NumberFieldDecrementProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { useForwardExpose } from '@robonen/vue';
import { useNumberFieldContext } from './context';

const { as = 'button' } = defineProps<NumberFieldDecrementProps>();
const { forwardRef } = useForwardExpose();
const ctx = useNumberFieldContext();

function onClick() {
  ctx.decrement();
}
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :type="as === 'button' ? 'button' : undefined"
    tabindex="-1"
    aria-hidden="true"
    :disabled="ctx.disabled.value || ctx.readonly.value || undefined"
    :data-disabled="(ctx.disabled.value || ctx.readonly.value) ? '' : undefined"
    @click="onClick"
  >
    <slot />
  </Primitive>
</template>
