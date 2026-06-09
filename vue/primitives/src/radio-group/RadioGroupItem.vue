<script lang="ts">
import type { PrimitiveProps } from '../primitive';
/**
 * A single selectable option within a `RadioGroupRoot`, rendered as a native
 * `<button role="radio">`. Clicking or pressing Space selects its `value`;
 * it reflects selection via `data-state` and participates in the group's
 * roving tab order. Provides context to a nested `RadioGroupIndicator`.
 */
export interface RadioGroupItemProps extends PrimitiveProps {
  value: string;
  disabled?: boolean;
  required?: boolean;

}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { Primitive } from '../primitive';
import { useCollectionInjector } from '../collection';
import { useForwardExpose } from '@robonen/vue';
import { provideRadioGroupItemContext, useRadioGroupContext } from './context';

const { value, disabled = false, as = 'button' } = defineProps<RadioGroupItemProps>();

const ctx = useRadioGroupContext();
const { CollectionItem } = useCollectionInjector();
const { forwardRef, currentElement } = useForwardExpose();

const isChecked = computed(() => ctx.value.value === value);
const isDisabled = computed(() => ctx.disabled.value || disabled);
const dataState = computed(() => isChecked.value ? 'checked' : 'unchecked');

provideRadioGroupItemContext({
  value,
  checked: isChecked,
  disabled: isDisabled,
});

// Only one item should be in the tab order:
// - the checked one, or
// - the first enabled one if nothing is checked.
const isTabStop = computed(() => {
  if (isDisabled.value) return false;
  if (ctx.value.value !== undefined) return isChecked.value;
  const firstEnabled = ctx.items.value.find(x => !x.hasAttribute('data-disabled'));
  return currentElement.value ? firstEnabled === currentElement.value : false;
});

function onClick(): void {
  if (isDisabled.value) return;
  ctx.setValue(value);
  currentElement.value?.focus();
}
function onKeyDown(event: KeyboardEvent): void {
  if (!currentElement.value) return;
  ctx.onItemKeyDown(event, currentElement.value);
}
</script>

<template>
  <CollectionItem>
    <Primitive
      :as="as"
      :ref="forwardRef"
      :type="as === 'button' ? 'button' : undefined"
      role="radio"
      :aria-checked="isChecked"
      :aria-required="required || undefined"
      :aria-disabled="isDisabled || undefined"
      :data-state="dataState"
      :data-disabled="isDisabled ? '' : undefined"
      :data-value="value"
      :tabindex="isTabStop ? 0 : -1"
      :disabled="isDisabled || undefined"
      @click="onClick"
      @keydown="onKeyDown"
    >
      <slot :checked="isChecked" />
    </Primitive>
  </CollectionItem>
</template>
