<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';
import type { AcceptableValue, CheckedState } from './context';

/**
 * A toggleable control with checked, unchecked, and `'indeterminate'` states,
 * built on a native `<button role="checkbox">`. The interactive root: it owns
 * the checked state (controlled via `v-model:checked` or uncontrolled via
 * `defaultChecked`), handles toggling, exposes a hidden form input when `name`
 * is set, and provides context to `CheckboxIndicator`. Use it whenever you need
 * a styled checkbox that integrates with forms or supports a mixed/partial state.
 *
 * The checked value is generic: with the default `trueValue`/`falseValue`
 * (`true`/`false`) it behaves as a boolean checkbox, but those props let the
 * model carry arbitrary values (`'yes'`/`'no'`, objects, …) compared by deep
 * equality. Nesting the root inside a `CheckboxGroupRoot` switches it to group
 * mode: its checked state derives from membership in the group's array model
 * and toggling adds/removes its `value`.
 */
export interface CheckboxRootProps<T = boolean> extends PrimitiveProps {
  /** Uncontrolled initial checked state. */
  defaultChecked?: T | 'indeterminate';
  /** Disable interaction. */
  disabled?: boolean;
  /** Mark associated hidden input as required. */
  required?: boolean;
  /** Hidden input name attribute. */
  name?: string;
  /**
   * Value submitted with the form (hidden input) and used for membership when
   * inside a `CheckboxGroupRoot`.
   * @default 'on'
   */
  value?: AcceptableValue;
  /** Id of the root element; anchors `<label for>` and aria-label derivation. */
  id?: string;
  /**
   * Value the model holds when checked.
   * @default true
   */
  trueValue?: T;
  /**
   * Value the model holds when unchecked.
   * @default false
   */
  falseValue?: T;
}

export interface CheckboxRootEmits<T = boolean> {
  checkedChange: [value: T | 'indeterminate'];
}
</script>

<script setup lang="ts" generic="T = boolean">
import type { Ref } from 'vue';
import { Primitive } from '../../internal/primitive';
import { computed, ref } from 'vue';
import { isEqual } from '@robonen/stdlib';
import { provideCheckboxContext, useCheckboxGroupContext } from './context';
import { getState, isIndeterminate } from './utils';
import { useForwardExpose } from '@robonen/vue';
import { RovingFocusItem } from '../../utilities/roving-focus';
import { VisuallyHiddenInputBubble } from '../../utilities/visually-hidden';

defineOptions({ inheritAttrs: false });

const {
  disabled: disabledProp = false,
  required = false,
  value = 'on',
  defaultChecked,
  name,
  id,
  trueValue = true as unknown as T,
  falseValue = false as unknown as T,
  as = 'button',
} = defineProps<CheckboxRootProps<T>>();

const { forwardRef, currentElement } = useForwardExpose();

const emit = defineEmits<CheckboxRootEmits<T>>();

// Group mode: when an ancestor `CheckboxGroupRoot` is present the checked state
// is derived from membership in the group's array and toggling mutates it.
const group = useCheckboxGroupContext(null);

const localChecked = ref<T | 'indeterminate'>(defaultChecked ?? (falseValue as T)) as Ref<T | 'indeterminate'>;

// `defineModel` handles both controlled (parent `v-model:checked`) and
// uncontrolled modes; `localChecked` backs the uncontrolled state seeded from
// `defaultChecked`. `checkedChange` is a separate public emit, so it stays.
const checked = defineModel<T | 'indeterminate' | undefined>('checked', {
  default: undefined,
  get: v => v ?? localChecked.value,
  set: (v) => {
    localChecked.value = v as T | 'indeterminate';
    return v;
  },
});

const disabled = computed<boolean>(() => (group?.disabled.value ?? false) || disabledProp);

// Canonical `CheckedState` for ARIA / `data-state` / the indicator. In group
// mode it is pure membership; standalone it compares the model to `trueValue`.
const checkedState = computed<CheckedState>(() => {
  if (group) return group.isChecked(value);
  const v = checked.value;
  if (isIndeterminate(v)) return 'indeterminate';
  return isEqual(v, trueValue);
});

function setChecked(v: T | 'indeterminate'): void {
  checked.value = v;
  emit('checkedChange', v);
}

function toggle(): void {
  if (disabled.value) return;
  if (group) {
    group.toggle(value);
    return;
  }
  // From indeterminate or unchecked → trueValue; from checked → falseValue.
  const next = checkedState.value === true ? falseValue : trueValue;
  setChecked(next);
}

function onKeyDown(event: KeyboardEvent): void {
  // Per WAI-ARIA a checkbox does not activate on Enter; block the implicit
  // form submit too.
  if (event.key === 'Enter') event.preventDefault();
  // <button> handles Space natively; synthesize toggle only for non-button hosts.
  if (as !== 'button' && event.key === ' ') {
    event.preventDefault();
    toggle();
  }
}

// Derive an accessible name from an associated `<label for=id>` when no explicit
// `aria-label` is supplied. Guarded for SSR (no `document`).
const ariaLabel = computed<string | undefined>(() => {
  if (!id || !currentElement.value || globalThis.document === undefined) return undefined;
  const label = globalThis.document.querySelector(`[for="${id}"]`) as HTMLElement | null;
  return label?.innerText || undefined;
});

// A standalone checkbox renders a hidden form input whenever `name` is set; a
// grouped checkbox never does (the group owns the submitted value).
const hasHiddenInput = computed<boolean>(() => !group && !!name);

provideCheckboxContext({
  checked: checkedState,
  disabled,
});
</script>

<template>
  <component
    :is="group?.rovingFocus.value ? RovingFocusItem : Primitive"
    :ref="forwardRef"
    v-bind="$attrs"
    :id="id"
    :as="as"
    :type="as === 'button' ? 'button' : undefined"
    :tabindex="(as === 'button' || group?.rovingFocus.value) ? undefined : (disabled ? -1 : 0)"
    :focusable="group?.rovingFocus.value ? !disabled : undefined"
    role="checkbox"
    :aria-checked="isIndeterminate(checkedState) ? 'mixed' : checkedState"
    :aria-required="required || undefined"
    :aria-disabled="disabled || undefined"
    :aria-label="($attrs['aria-label'] as string) || ariaLabel"
    :data-state="getState(checkedState)"
    :data-disabled="disabled ? '' : undefined"
    :disabled="disabled || undefined"
    @click="toggle"
    @keydown="onKeyDown"
  >
    <slot :checked="checkedState" :model-value="checked" :state="checkedState" />
    <VisuallyHiddenInputBubble
      v-if="hasHiddenInput"
      :name="name!"
      :value="value"
      :checked="checkedState === true"
      :required="required"
      :disabled="disabled"
    />
  </component>
</template>
