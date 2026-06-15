<script lang="ts">
import type { Direction } from '../../utilities/config-provider';
import type { Orientation } from '../../utilities/roving-focus';
import type { PrimitiveProps } from '../../internal/primitive';
import type { AcceptableValue } from './context';

/**
 * Coordinates a set of related checkboxes behind a single array model. It owns
 * the list of selected `value`s (`v-model` or uncontrolled `defaultValue`),
 * applies a group-level `disabled`, optionally wires arrow-key roving focus
 * across the children, and — when `name` is set inside a `<form>` — submits the
 * selection through hidden inputs. Each nested `CheckboxRoot` derives its
 * checked state from membership in this model and toggling adds/removes its
 * `value`. Reach for it whenever several checkboxes share one logical answer
 * (a multi-select question, a filter set, a permissions matrix).
 */
export interface CheckboxGroupRootProps<T extends AcceptableValue = AcceptableValue> extends PrimitiveProps {
  /** Uncontrolled initial selection. */
  defaultValue?: T[];
  /** Controlled selection. Bind with `v-model`. */
  modelValue?: T[];
  /** Disable every checkbox in the group. */
  disabled?: boolean;
  /** Mark the submitted group input as required. */
  required?: boolean;
  /** Hidden input name; serializes the selection for form submission. */
  name?: string;
  /**
   * Enable arrow-key roving focus across the checkboxes.
   * @default true
   */
  rovingFocus?: boolean;
  /** Navigation orientation when `rovingFocus` is on. */
  orientation?: Orientation;
  /** Writing direction (RTL-aware navigation). Falls back to config `dir`. */
  dir?: Direction;
  /**
   * Wrap focus around the ends.
   * @default false
   */
  loop?: boolean;
}

export interface CheckboxGroupRootEmits<T extends AcceptableValue = AcceptableValue> {
  'update:modelValue': [value: T[]];
  valueChange: [value: T[]];
}
</script>

<script setup lang="ts" generic="T extends AcceptableValue = AcceptableValue">
import type { Ref } from 'vue';
import { computed, ref, toRef, watch } from 'vue';
import { isEqual } from '@robonen/stdlib';
import { Primitive } from '../../internal/primitive';
import { RovingFocusGroup } from '../../utilities/roving-focus';
import { VisuallyHiddenInput } from '../../utilities/visually-hidden';
import { useForwardExpose } from '@robonen/vue';
import { provideCheckboxGroupContext } from './context';

const {
  defaultValue,
  disabled = false,
  required = false,
  name,
  rovingFocus = true,
  orientation,
  dir,
  loop = false,
  as = 'div',
} = defineProps<CheckboxGroupRootProps<T>>();

const emit = defineEmits<CheckboxGroupRootEmits<T>>();

const { forwardRef, currentElement } = useForwardExpose();

// `modelValue` is an array replaced wholesale on every toggle, so `shallowRef`
// avoids deep-tracking each member.
const localValue = ref<T[]>(defaultValue ?? []) as Ref<T[]>;

const model = defineModel<T[] | undefined>({
  default: undefined,
  get: v => v ?? localValue.value,
  set: (v) => {
    localValue.value = (v ?? []) as T[];
    return v;
  },
});

const currentValue = computed<T[]>(() => model.value ?? localValue.value);

function isChecked(value: AcceptableValue): boolean {
  for (const v of currentValue.value) {
    if (isEqual(v, value)) return true;
  }
  return false;
}

function toggle(value: AcceptableValue): void {
  if (disabled) return;
  const next = [...currentValue.value];
  const index = next.findIndex(v => isEqual(v, value));
  if (index === -1) next.push(value as T);
  else next.splice(index, 1);
  model.value = next;
  emit('valueChange', next);
}

const rovingFocusProps = computed(() =>
  rovingFocus ? { loop, dir, orientation } : {});

// Only submit through the form when inside one; SSR renders so the field
// submits without JS.
const isFormControl = computed<boolean>(() => {
  if (globalThis.document === undefined) return true;
  const el = currentElement.value;
  return !!el && !!el.closest('form');
});

watch(model, (v) => {
  if (v !== undefined && v !== localValue.value) localValue.value = v;
});

provideCheckboxGroupContext({
  modelValue: currentValue as Ref<AcceptableValue[]>,
  disabled: toRef(() => disabled),
  rovingFocus: toRef(() => rovingFocus),
  toggle,
  isChecked,
});
</script>

<template>
  <component
    :is="rovingFocus ? RovingFocusGroup : Primitive"
    :ref="forwardRef"
    :as="as"
    role="group"
    :aria-disabled="disabled || undefined"
    :data-disabled="disabled ? '' : undefined"
    v-bind="rovingFocusProps"
  >
    <slot :model-value="currentValue" />
    <VisuallyHiddenInput
      v-if="isFormControl && name"
      :name="name"
      :value="currentValue"
      :required="required"
      :disabled="disabled"
    />
  </component>
</template>
