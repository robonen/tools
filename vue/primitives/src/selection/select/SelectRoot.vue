<script lang="ts">
import type { Direction } from '../../utilities/config-provider';
import type { AcceptableValue } from './utils';

/**
 * A custom, fully stylable replacement for the native `<select>` element: a
 * trigger button that opens a floating listbox of options, with full keyboard
 * support (arrow keys, Home/End, type-ahead search), focus trapping, and an
 * optional hidden native `<select>` for native form submission.
 *
 * Use it when you need a single- or multi-choice dropdown whose menu and options
 * must be styled beyond what a native control allows. The root owns the selected
 * value and open state and provides context to every part; bind `v-model` for
 * the value and `v-model:open` (or listen to `update:modelValue` / `update:open`)
 * to control or observe it. Values may be strings, numbers, booleans, or objects
 * (compared via `by`). Compose it from a `SelectTrigger` (with
 * `SelectValue`/`SelectIcon`) plus a portalled `SelectContent` of `SelectItem`s.
 */
export interface SelectRootProps<T extends AcceptableValue = AcceptableValue> {
  /** Reading direction. Falls back to ConfigProvider. */
  dir?: Direction;
  /** Disable the whole select. */
  disabled?: boolean;
  /** Mark field as required for native form validation. */
  required?: boolean;
  /** Native input name for form submission. */
  name?: string;
  /** Uncontrolled default value. */
  defaultValue?: T | T[];
  /** Uncontrolled default open state. */
  defaultOpen?: boolean;
  /** Allow selecting multiple options; the model becomes an array. */
  multiple?: boolean;
  /**
   * Compare object values by a property key or a custom comparator. Omitted →
   * `===` for primitives / structural deep-equality for objects.
   */
  by?: string | ((a: T, b: T) => boolean);
  /** Native autocomplete attribute forwarded to the hidden native select. */
  autocomplete?: string;
}

export interface SelectRootEmits<T extends AcceptableValue = AcceptableValue> {
  'update:modelValue': [value: T | T[] | undefined];
  'update:open': [open: boolean];
}
</script>

<script setup lang="ts" generic="T extends AcceptableValue = AcceptableValue">
import type { Ref } from 'vue';
import { computed, ref, shallowRef, toRef, watch } from 'vue';

import { useId } from '../../utilities/config-provider';
import { PopperRoot } from '../../overlays/popper';
import { provideSelectRootContext } from './context';
import type { SelectOption } from './context';
import SelectBubbleSelect from './SelectBubbleSelect.vue';
import { compare, shouldShowPlaceholder } from './utils';

defineOptions({ inheritAttrs: false });

const {
  dir,
  disabled = false,
  required = false,
  name,
  defaultValue,
  defaultOpen = false,
  multiple = false,
  by,
  autocomplete,
} = defineProps<SelectRootProps<T>>();

defineSlots<{
  default?: (props: {
    modelValue: T | T[] | undefined;
    open: boolean;
  }) => unknown;
}>();

const localOpen = ref<boolean>(defaultOpen);
const open = defineModel<boolean>('open', {
  default: undefined,
  get: v => v ?? localOpen.value,
  set: (v) => {
    localOpen.value = v;
    return v;
  },
});

const localValue = ref<T | T[] | undefined>(defaultValue ?? (multiple ? ([] as T[]) : undefined)) as Ref<T | T[] | undefined>;
const value = defineModel<T | T[] | undefined>('modelValue', {
  default: undefined,
  get: v => (v ?? localValue.value),
  set: (v) => {
    localValue.value = v;
    return v;
  },
});

const contentId = useId(undefined, 'select-content');
const dirRef = toRef(() => dir);
const disabledRef = toRef(() => disabled);
const requiredRef = toRef(() => required);
const multipleRef = toRef(() => multiple);
const nameRef = toRef(() => name);

const triggerElement = shallowRef<HTMLElement | undefined>(undefined);
const valueElement = shallowRef<HTMLElement | undefined>(undefined);
const triggerPointerDownPosRef = ref<{ x: number; y: number } | null>(null);
const selectedItemRef = shallowRef<HTMLElement | undefined>(undefined);
const selectedItemTextRef = shallowRef<HTMLElement | undefined>(undefined);
const displayValue = ref<string | undefined>(undefined);

// Raw (non-reactive) source of truth for option membership; `optionsSet` is the
// published snapshot consumers read. Mutating the raw set then re-publishing a
// fresh snapshot avoids tracking the ref inside the registration effect (which
// would otherwise recurse: read optionsSet -> write optionsSet -> re-run).
const rawOptions = new Set<SelectOption>();
const optionsSet = shallowRef(new Set<SelectOption>());

const isEmptyModelValue = computed(() => shouldShowPlaceholder(value.value));

function getOptionFrom(source: Iterable<SelectOption>, v: AcceptableValue): SelectOption | undefined {
  for (const option of source) {
    if (compare(option.value as T, v as T, by as never)) return option;
  }
  return undefined;
}

function onOptionAdd(option: SelectOption) {
  const existing = getOptionFrom(rawOptions, option.value);
  if (existing) rawOptions.delete(existing);
  rawOptions.add(option);
  optionsSet.value = new Set(rawOptions);
}

function onOptionRemove(option: SelectOption) {
  const existing = getOptionFrom(rawOptions, option.value);
  if (!existing) return;
  rawOptions.delete(existing);
  optionsSet.value = new Set(rawOptions);
}

// Persist a single-value label for the legacy `displayValue` slot path.
watch([optionsSet, value], () => {
  const current = value.value;
  if (current === undefined || Array.isArray(current)) return;
  const text = getOptionFrom(optionsSet.value, current)?.textContent;
  if (text !== undefined) displayValue.value = text;
}, { immediate: true });

function handleValueChange(newValue: AcceptableValue) {
  if (multiple) {
    const array = Array.isArray(value.value) ? [...value.value] : [];
    const index = array.findIndex(v => compare(v as T, newValue as T, by as never));
    if (index === -1) array.push(newValue as T);
    else array.splice(index, 1);
    value.value = [...array] as T[];
  }
  else {
    value.value = newValue as T;
    displayValue.value = getOptionFrom(rawOptions, newValue)?.textContent;
    open.value = false;
  }
}

function isSelectedValue(itemValue: AcceptableValue): boolean {
  const current = value.value;
  if (current === undefined) return false;
  if (Array.isArray(current)) {
    for (const v of current) {
      if (compare(itemValue as T, v as T, by as never)) return true;
    }
    return false;
  }
  return compare(itemValue as T, current as T, by as never);
}

function itemRefCallback(el: HTMLElement | undefined, itemValue: AcceptableValue, isDisabled: boolean) {
  if (!isDisabled && isSelectedValue(itemValue)) {
    selectedItemRef.value = el;
  }
}

function itemTextRefCallback(el: HTMLElement | undefined, itemValue: AcceptableValue) {
  if (isSelectedValue(itemValue)) {
    selectedItemTextRef.value = el;
  }
}

const nativeOptions = computed(() => Array.from(optionsSet.value, o => o.value));

const isFormControl = computed(() => {
  const el = triggerElement.value;
  return !!el && !!el.closest('form');
});

provideSelectRootContext({
  value,
  onValueChange: handleValueChange,
  open,
  onOpenChange: (v) => { open.value = v; },
  dir: dirRef,
  disabled: disabledRef,
  required: requiredRef,
  multiple: multipleRef,
  by: by as never,
  name: nameRef,
  triggerElement,
  onTriggerChange: (el) => { triggerElement.value = el; },
  valueElement,
  onValueElementChange: (el) => { valueElement.value = el; },
  triggerPointerDownPosRef,
  contentId,
  isEmptyModelValue,
  displayValue,
  optionsSet,
  onOptionAdd,
  onOptionRemove,
  itemRefCallback,
  itemTextRefCallback,
  selectedItemRef,
  selectedItemTextRef,
});
</script>

<template>
  <PopperRoot>
    <slot :model-value="value" :open="open" />

    <SelectBubbleSelect
      v-if="isFormControl && name"
      :name="name"
      :autocomplete="autocomplete"
      :required="required"
      :disabled="disabled"
      :multiple="multiple"
      :options="nativeOptions"
      :value="value"
      @change="handleValueChange"
    />

    <input
      v-else-if="name"
      type="hidden"
      :name="name"
      :value="Array.isArray(value) ? '' : (value ?? '')"
      :required="required"
      :disabled="disabled"
      :autocomplete="autocomplete"
      aria-hidden="true"
      style="display: none"
      tabindex="-1"
    />
  </PopperRoot>
</template>
