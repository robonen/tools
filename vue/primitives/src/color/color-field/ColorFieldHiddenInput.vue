<script lang="ts">
/**
 * A visually-hidden native `<input>` carrying the surrounding `ColorFieldRoot`'s
 * formatted colour under `name`, so the colour participates in native form
 * submission and constraint validation. Renders nothing unless `name` is set.
 * Place it inside a `ColorFieldRoot`.
 */
export interface ColorFieldHiddenInputProps {
  /** Form field `name`. The input is only rendered when this is set. */
  name?: string;
  /** Mark the hidden input as required for native validation. */
  required?: boolean;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { formatHsva } from '../../internal/color';
import { VisuallyHiddenInput } from '../../utilities/visually-hidden';
import { useColorFieldContext } from './context';

const { name, required } = defineProps<ColorFieldHiddenInputProps>();
const ctx = useColorFieldContext();

// Serialize as `#rrggbbaa` so alpha survives the round-trip through the form.
const value = computed(() => formatHsva(ctx.hsva.value, 'hex8'));
</script>

<template>
  <VisuallyHiddenInput
    v-if="name"
    :name="name"
    :value="value"
    :required="required"
    :disabled="ctx.disabled.value"
  />
</template>
