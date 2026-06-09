<script lang="ts">
import type { PrimitiveProps } from '../primitive';
import type { CheckedState } from './context';

/**
 * A toggleable control with checked, unchecked, and `'indeterminate'` states,
 * built on a native `<button role="checkbox">`. The interactive root: it owns
 * the checked state (controlled via `v-model:checked` or uncontrolled via
 * `defaultChecked`), handles toggling, exposes a hidden form input when `name`
 * is set, and provides context to `CheckboxIndicator`. Use it whenever you need
 * a styled checkbox that integrates with forms or supports a mixed/partial state.
 */
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
import { computed, ref, toRef } from 'vue';
import { provideCheckboxContext } from './context';
import { useForwardExpose } from '@robonen/vue';

const { disabled = false, required = false, value = 'on', defaultChecked, name, as = 'button' } = defineProps<CheckboxRootProps>();

const { forwardRef } = useForwardExpose();

const emit = defineEmits<CheckboxRootEmits>();

const localChecked = ref<CheckedState>(defaultChecked ?? false);

// `defineModel` handles both controlled (parent `v-model:checked`) and
// uncontrolled modes; `localChecked` backs the uncontrolled state seeded from
// `defaultChecked`. `checkedChange` is a separate public emit, so it stays.
const checked = defineModel<CheckedState | undefined>('checked', {
  default: undefined,
  get: v => v ?? localChecked.value,
  set: (v) => {
    localChecked.value = v as CheckedState;
    return v;
  },
});

function setChecked(v: CheckedState): void {
  checked.value = v;
  emit('checkedChange', v);
}

function toggle(): void {
  if (disabled) return;
  setChecked(checked.value !== true);
}

function onKeyDown(event: KeyboardEvent): void {
  // Prevent form submit on Enter when inside a form.
  if (event.key === 'Enter') event.preventDefault();
  // <button> handles Space natively; synthesize toggle only for non-button hosts.
  if (as !== 'button' && event.key === ' ') {
    event.preventDefault();
    toggle();
  }
}

// Read through the model so the context reflects both controlled (parent
// `v-model:checked`) and uncontrolled state; coalesce the model's `undefined`
// default to `false`. `toRef(() => disabled)` gives a reactive identity
// passthrough without `ReactiveEffect`/cache.
const checkedState = computed<CheckedState>(() => checked.value ?? false);

provideCheckboxContext({
  checked: checkedState,
  disabled: toRef(() => disabled),
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :type="as === 'button' ? 'button' : undefined"
    :tabindex="as === 'button' ? undefined : (disabled ? -1 : 0)"
    role="checkbox"
    :aria-checked="checkedState === 'indeterminate' ? 'mixed' : checkedState"
    :aria-required="required || undefined"
    :aria-disabled="disabled || undefined"
    :data-state="checkedState === 'indeterminate' ? 'indeterminate' : (checkedState ? 'checked' : 'unchecked')"
    :data-disabled="disabled ? '' : undefined"
    :disabled="disabled || undefined"
    @click="toggle"
    @keydown="onKeyDown"
  >
    <slot :checked="checkedState" />
    <input
      v-if="name"
      type="checkbox"
      tabindex="-1"
      aria-hidden="true"
      :name="name"
      :value="value"
      :checked="checkedState === true"
      :required="required"
      :disabled="disabled"
      style="position: absolute; pointer-events: none; opacity: 0; margin: 0; transform: translateX(-100%);"
    >
  </Primitive>
</template>
