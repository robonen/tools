<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * Displays the label(s) of the currently selected option(s) inside the trigger,
 * or the `placeholder` when nothing is selected. Renders into a non-interactive
 * span so pointer events fall through to the trigger. Exposes the resolved
 * `selectedLabel` array and raw `modelValue` to its default slot for custom
 * rendering (e.g. multi-value chips), and reflects a `data-placeholder`
 * attribute while empty.
 */
export interface SelectValueProps extends PrimitiveProps {
  /** Text shown when no option is selected. */
  placeholder?: string;
}
</script>

<script setup lang="ts">
import { computed, watchPostEffect } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { useSelectRootContext } from './context';
import { valueComparator } from './utils';

const { as = 'span', placeholder = '' } = defineProps<SelectValueProps>();

const { forwardRef, currentElement } = useForwardExpose();
const rootCtx = useSelectRootContext();

watchPostEffect(() => rootCtx.onValueElementChange(currentElement.value));

const selectedLabel = computed<string[]>(() => {
  const options = Array.from(rootCtx.optionsSet.value);
  const labelFor = (v: unknown) =>
    options.find(option => valueComparator(v as never, option.value as never, rootCtx.by as never))?.textContent ?? '';

  const current = rootCtx.value.value;
  if (Array.isArray(current)) {
    return current.map(labelFor).filter(Boolean);
  }
  // Fall back to the persisted single-value label so a freshly-selected value
  // keeps showing after the listbox (and its items) unmount.
  const fromOptions = current === undefined ? '' : labelFor(current);
  const resolved = fromOptions || (rootCtx.displayValue.value ?? '');
  return resolved ? [resolved] : [];
});

const slotText = computed(() => (selectedLabel.value.length ? selectedLabel.value.join(', ') : placeholder));
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    style="pointer-events: none"
    :data-placeholder="selectedLabel.length ? undefined : placeholder"
  >
    <slot :selected-label="selectedLabel" :model-value="rootCtx.value.value">
      {{ slotText }}
    </slot>
  </Primitive>
</template>
