<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The accessible name for the whole colour-picker cluster. It renders a
 * `<label>` (or any element via `as`) with a generated `id` that it registers
 * into the `ColorFieldRoot` context, so the otherwise-orphaned sub-pickers
 * (`ColorArea`, `HueSlider`, `AlphaSlider`) and `ColorFieldInput` can reference
 * it via `aria-labelledby`. This closes the "four orphaned controls" a11y gap.
 * Place it inside a `ColorFieldRoot`.
 */
export interface ColorFieldLabelProps extends PrimitiveProps {
  /** Override the generated label id. */
  id?: string;
}
</script>

<script setup lang="ts">
import { onScopeDispose, watchEffect } from 'vue';
import { Primitive } from '../../internal/primitive';
import { useColorFieldContext } from './context';
import { useId } from '../../utilities/config-provider';
import { useForwardExpose } from '@robonen/vue';

const { id, as = 'label' } = defineProps<ColorFieldLabelProps>();
const ctx = useColorFieldContext();

const generatedId = useId(undefined, 'color-field-label');
// An explicit `id` prop wins over the generated one.
const labelId = () => id ?? generatedId.value;

// Publish our id into the shared context so the sub-pickers can reference it.
watchEffect(() => {
  ctx.labelId.value = labelId();
});
onScopeDispose(() => {
  ctx.labelId.value = undefined;
});

const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :id="labelId()"
    :data-disabled="ctx.disabled.value ? '' : undefined"
  >
    <slot />
  </Primitive>
</template>
