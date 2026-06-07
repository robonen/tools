<script lang="ts">
import type { PrimitiveProps } from '../primitive';
import type { CheckedState } from './context';

export interface CheckboxRootProps extends PrimitiveProps {
  /** Uncontrolled initial checked state. */
  defaultChecked?: CheckedState;
  /** Disable interaction. */
  disabled?: boolean;
  /** Mark associated hidden input as required. */
  required?: boolean;
  /** Hidden input name attribute. */
  name?: string;
  /** Hidden input value attribute. @default 'on' */
  value?: string;
}

export interface CheckboxRootEmits {
  checkedChange: [value: CheckedState];
}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { ref, toRef, watch } from 'vue';
import { provideCheckboxContext } from './context';
import { useForwardExpose } from '@robonen/vue';

const { disabled = false, required = false, value = 'on', defaultChecked, name, as = 'button' } = defineProps<CheckboxRootProps>();

const { forwardRef } = useForwardExpose();

const emit = defineEmits<CheckboxRootEmits>();
const model = defineModel<CheckedState | undefined>('checked', { default: undefined });

const localChecked = ref<CheckedState>(model.value ?? defaultChecked ?? false);

watch(model, (v) => {
  if (v === undefined) return;
  if (v !== localChecked.value) localChecked.value = v;
});

function setChecked(v: CheckedState): void {
  localChecked.value = v;
  model.value = v;
  emit('checkedChange', v);
}

function toggle(): void {
  if (disabled) return;
  setChecked(localChecked.value !== true);
}

function onKeyDown(event: KeyboardEvent): void {
  // Prevent form submit on Enter when inside a form.
  if (event.key === 'Enter') event.preventDefault();
}

provideCheckboxContext({
  // `localChecked` is already a `Ref<CheckedState>`; forward directly without
  // wrapping in a computed. `toRef(() => disabled)` gives a reactive identity
  // passthrough without `ReactiveEffect`/cache.
  checked: localChecked,
  disabled: toRef(() => disabled),
});

// Inlined in template — no need for a cached computed for a single call site.
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :type="as === 'button' ? 'button' : undefined"
    role="checkbox"
    :aria-checked="localChecked === 'indeterminate' ? 'mixed' : localChecked"
    :aria-required="required || undefined"
    :aria-disabled="disabled || undefined"
    :data-state="localChecked === 'indeterminate' ? 'indeterminate' : (localChecked ? 'checked' : 'unchecked')"
    :data-disabled="disabled ? '' : undefined"
    :disabled="disabled || undefined"
    @click="toggle"
    @keydown="onKeyDown"
  >
    <slot :checked="localChecked" />
    <input
      v-if="name"
      type="checkbox"
      tabindex="-1"
      aria-hidden="true"
      :name="name"
      :value="value"
      :checked="localChecked === true"
      :required="required"
      :disabled="disabled"
      style="position: absolute; pointer-events: none; opacity: 0; margin: 0; transform: translateX(-100%);"
    >
  </Primitive>
</template>
