<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A native text `<input>` bound to the formatted colour string of the
 * surrounding `ColorFieldRoot`. As the user types it parses the value via
 * `parseColor`; a valid colour updates the canonical state, an invalid one is
 * left uncommitted and `aria-invalid` flips to `true` so the field reflects the
 * live parse state. While the input is focused it shows the user's in-progress
 * text; on blur it re-syncs to the canonical formatted value. Place it inside a
 * `ColorFieldRoot`.
 */
export interface ColorFieldInputProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { formatHsva, parseColor } from '../../internal/color';
import { Primitive } from '../../internal/primitive';
import { useColorFieldContext } from './context';
import { useForwardExpose } from '@robonen/vue';

const { as = 'input' } = defineProps<ColorFieldInputProps>();
const ctx = useColorFieldContext();

// The canonical colour, formatted as a hex string for editing.
const canonical = computed(() => formatHsva(ctx.hsva.value, 'hex'));

// Local draft text: what the user sees/types. Mirrors `canonical` unless the
// user is mid-edit with text that does not (yet) parse.
const draft = ref(canonical.value);
const focused = ref(false);

// When the canonical colour changes externally (e.g. dragging a slider), reflect
// it into the input — but only while the user is not actively editing.
watch(canonical, (next) => {
  if (!focused.value) draft.value = next;
});

const parsed = computed(() => parseColor(draft.value));
const invalid = computed(() => parsed.value === null);

function onInput(event: Event): void {
  if (ctx.disabled.value) return;
  draft.value = (event.target as HTMLInputElement).value;
  const result = parseColor(draft.value);
  if (result) {
    // Drive the canonical colour through the shared setters so preserve-hue
    // policy still applies (set all channels in one shot via SV + hue + alpha).
    ctx.setHue(result.h);
    ctx.setSaturationValue(result.s, result.v);
    ctx.setAlpha(result.a);
  }
}

function onFocus(): void {
  focused.value = true;
}

function onBlur(): void {
  focused.value = false;
  // Snap back to the canonical formatted value, discarding invalid drafts.
  draft.value = canonical.value;
}

const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :value="draft"
    :disabled="ctx.disabled.value || undefined"
    :aria-invalid="invalid || undefined"
    :aria-labelledby="ctx.labelId.value"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :data-invalid="invalid ? '' : undefined"
    @input="onInput"
    @focus="onFocus"
    @blur="onBlur"
  />
</template>
