<script lang="ts">
import type { Direction } from '../config-provider';

export interface SelectRootProps {
  /** Reading direction. Falls back to ConfigProvider. */
  dir?: Direction;
  /** Disable the whole select. */
  disabled?: boolean;
  /** Mark field as required for native form validation. */
  required?: boolean;
  /** Native input name for form submission. */
  name?: string;
  /** Uncontrolled default value. */
  defaultValue?: string;
  /** Uncontrolled default open state. */
  defaultOpen?: boolean;
  /** Native autocomplete attribute forwarded to the hidden input. */
  autocomplete?: string;
}

export interface SelectRootEmits {
  'update:modelValue': [value: string | undefined];
  'update:open': [open: boolean];
}
</script>

<script setup lang="ts">
import { ref, shallowRef, toRef, watch } from 'vue';

import { useId } from '../config-provider';
import { PopperRoot } from '../popper';
import { provideSelectRootContext } from './context';
import type { SelectValue } from './context';

defineOptions({ inheritAttrs: false });

const {
  dir,
  disabled = false,
  required = false,
  name,
  defaultValue,
  defaultOpen = false,
  autocomplete,
} = defineProps<SelectRootProps>();

const emit = defineEmits<SelectRootEmits>();

const localOpen = ref<boolean>(defaultOpen);
const open = defineModel<boolean>('open', {
  default: undefined,
  get: v => v ?? localOpen.value,
  set: (v) => {
    localOpen.value = v;
    return v;
  },
});

const localValue = ref<SelectValue | undefined>(defaultValue);
const value = defineModel<SelectValue | undefined>('modelValue', {
  default: undefined,
  get: v => v ?? localValue.value,
  set: (v) => {
    localValue.value = v;
    return v;
  },
});

const contentId = useId(undefined, 'select-content');
const dirRef = toRef(() => dir);
const disabledRef = toRef(() => disabled);
const requiredRef = toRef(() => required);
const nameRef = toRef(() => name);

const triggerElement = shallowRef<HTMLElement | undefined>(undefined);
const selectedItemRef = shallowRef<HTMLElement | undefined>(undefined);
const selectedItemTextRef = shallowRef<HTMLElement | undefined>(undefined);
const displayValue = ref<string | undefined>(undefined);
const optionsSet = shallowRef(new Map<SelectValue, string>());

function onOptionAdd(v: SelectValue, textContent: string) {
  optionsSet.value = new Map(optionsSet.value).set(v, textContent);
}

function onOptionRemove(v: SelectValue) {
  const m = new Map(optionsSet.value);
  m.delete(v);
  optionsSet.value = m;
}

// Update displayValue whenever optionsSet or value changes.
// When content is open, optionsSet contains the text; we persist the last
// known text so SelectValue keeps showing after content closes.
watch([optionsSet, value], () => {
  if (value.value !== undefined) {
    const text = optionsSet.value.get(value.value);
    if (text !== undefined) displayValue.value = text;
  }
}, { immediate: true });

function handleValueChange(newValue: SelectValue) {
  value.value = newValue;
  displayValue.value = optionsSet.value.get(newValue);
  emit('update:modelValue', newValue);
  open.value = false;
}

function itemRefCallback(el: HTMLElement | undefined, itemValue: SelectValue, isDisabled: boolean) {
  if (itemValue === value.value && !isDisabled) {
    selectedItemRef.value = el;
  }
}

function itemTextRefCallback(el: HTMLElement | undefined, itemValue: SelectValue) {
  if (itemValue === value.value) {
    selectedItemTextRef.value = el;
  }
}

provideSelectRootContext({
  value,
  onValueChange: handleValueChange,
  open,
  onOpenChange: (v) => { open.value = v; },
  dir: dirRef,
  disabled: disabledRef,
  required: requiredRef,
  name: nameRef,
  triggerElement,
  onTriggerChange: (el) => { triggerElement.value = el; },
  contentId,
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
    <slot />
    <input
      v-if="name"
      type="hidden"
      :name="name"
      :value="value ?? ''"
      :required="required"
      :disabled="disabled"
      :autocomplete="autocomplete"
      aria-hidden="true"
      style="display: none"
      tabindex="-1"
    />
  </PopperRoot>
</template>
