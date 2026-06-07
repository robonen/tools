<script lang="ts">
import type { Direction } from '../config-provider';
import type { AcceptableValue, ComboboxFilterFunction, ComboboxFilterItem } from './utils';

export interface ComboboxRootProps<T extends AcceptableValue = AcceptableValue> {
  /** Controlled selected value. Use `v-model`. */
  modelValue?: T | T[];
  /** Uncontrolled initial value. */
  defaultValue?: T | T[];
  /** Controlled open state. Use `v-model:open`. */
  open?: boolean;
  /** Uncontrolled default open state. */
  defaultOpen?: boolean;
  /** Allow selecting multiple values. */
  multiple?: boolean;
  /** Reading direction. Falls back to `ConfigProvider`. */
  dir?: Direction;
  /** Disable the whole combobox. */
  disabled?: boolean;
  /** Mark as required for native form validation. */
  required?: boolean;
  /** Native input name for form submission. */
  name?: string;
  /** Reset the search term when the input is blurred. @default true */
  resetSearchTermOnBlur?: boolean;
  /** Reset the search term when a value is selected (single mode). @default true */
  resetSearchTermOnSelect?: boolean;
  /** Skip the built-in filter; render every item regardless of search term. */
  ignoreFilter?: boolean;
  /** Custom filter implementation. Overrides the default substring match. */
  filterFunction?: ComboboxFilterFunction;
  /** Map the current model value to the input's display value. */
  displayValue?: (value: T | T[] | undefined) => string;
  /** Compare values by key, or via a custom comparator. */
  by?: string | ((a: T, b: T) => boolean);
}

export interface ComboboxRootEmits<T extends AcceptableValue = AcceptableValue> {
  'update:modelValue': [value: T | T[] | undefined];
  'update:open': [open: boolean];
}
</script>

<script setup lang="ts" generic="T extends AcceptableValue = AcceptableValue">
import type { ShallowRef } from 'vue';
import type { ComboboxFilterState, ComboboxItemInfo } from './context';

import { computed, nextTick, ref, shallowRef, toRef, triggerRef, watch } from 'vue';

import { useConfig, useId } from '../config-provider';
import { PopperRoot } from '../popper';
import { provideComboboxRootContext } from './context';
import { defaultFilter, valueComparator } from './utils';

defineOptions({ inheritAttrs: false });

const {
  modelValue,
  defaultValue,
  defaultOpen = false,
  multiple = false,
  dir,
  disabled = false,
  required = false,
  name,
  resetSearchTermOnBlur = true,
  resetSearchTermOnSelect = true,
  ignoreFilter = false,
  filterFunction,
  displayValue,
  by,
} = defineProps<ComboboxRootProps<T>>();

const emit = defineEmits<ComboboxRootEmits<T>>();

const config = useConfig();
const direction = computed(() => dir ?? config.dir.value);

const localOpen = ref<boolean>(defaultOpen);
const open = defineModel<boolean>('open', {
  default: undefined,
  get: v => v ?? localOpen.value,
  set: (v) => {
    localOpen.value = v;
    return v;
  },
});

const initial = (modelValue ?? defaultValue) as T | T[] | undefined;
const localValue = shallowRef<T | T[] | undefined>(
  multiple
    ? (Array.isArray(initial) ? initial.slice() : (initial === undefined ? [] : [initial]))
    : (Array.isArray(initial) ? initial[0] : initial),
);
const value = defineModel<T | T[] | undefined>('modelValue', {
  default: undefined,
  get: v => v ?? localValue.value,
  set: (v) => {
    localValue.value = v;
    return v;
  },
});

const searchTerm = ref('');
const isUserInputted = ref(false);

const contentId = useId(undefined, 'combobox-content');

const triggerElement = shallowRef<HTMLElement | undefined>(undefined);
const inputElement = shallowRef<HTMLInputElement | undefined>(undefined);
const contentElement = shallowRef<HTMLElement | undefined>(undefined);
const parentElement = shallowRef<HTMLElement | undefined>(undefined);

const selectedValue = shallowRef<T | undefined>(undefined) as ShallowRef<T | undefined>;
const selectedValueId = ref<string | undefined>(undefined);

const allItems = shallowRef(new Map<string, ComboboxItemInfo<T>>());
const allGroups = shallowRef(new Map<string, Set<string>>());

function onItemRegister(id: string, info: ComboboxItemInfo<T>) {
  allItems.value.set(id, info);
  triggerRef(allItems);
}

function onItemUnregister(id: string) {
  allItems.value.delete(id);
  triggerRef(allItems);
}

function onGroupRegister(groupId: string) {
  if (!allGroups.value.has(groupId)) {
    allGroups.value.set(groupId, new Set());
    triggerRef(allGroups);
  }
}

function onGroupUnregister(groupId: string) {
  allGroups.value.delete(groupId);
  triggerRef(allGroups);
}

function onGroupItemRegister(groupId: string, itemId: string) {
  let set = allGroups.value.get(groupId);
  if (!set) {
    set = new Set();
    allGroups.value.set(groupId, set);
  }
  set.add(itemId);
  triggerRef(allGroups);
}

function onGroupItemUnregister(groupId: string, itemId: string) {
  const set = allGroups.value.get(groupId);
  if (set) {
    set.delete(itemId);
    triggerRef(allGroups);
  }
}

const filterRef = toRef(() => filterFunction);
const ignoreFilterRef = toRef(() => ignoreFilter);

const filterState = computed<ComboboxFilterState>(() => {
  const items = allItems.value;
  const groups = allGroups.value;

  if (!searchTerm.value || ignoreFilterRef.value || !isUserInputted.value) {
    return {
      count: items.size,
      items: new Set(items.keys()),
      groups: new Set(groups.keys()),
    };
  }

  const candidates: ComboboxFilterItem[] = [];
  for (const [id, info] of items) candidates.push({ id, textValue: info.textValue });

  const fn = filterRef.value ?? defaultFilter;
  const filtered = fn(candidates, searchTerm.value);

  const visibleItems = new Set<string>();
  for (let i = 0; i < filtered.length; i++) visibleItems.add(filtered[i]!.id);

  const visibleGroups = new Set<string>();
  for (const [groupId, set] of groups) {
    for (const itemId of set) {
      if (visibleItems.has(itemId)) {
        visibleGroups.add(groupId);
        break;
      }
    }
  }

  return {
    count: visibleItems.size,
    items: visibleItems,
    groups: visibleGroups,
  };
});

function isSelected(v: T): boolean {
  return valueComparator(value.value as T | T[] | undefined, v, by);
}

function commitValue(next: T | T[] | undefined) {
  value.value = next;
  emit('update:modelValue', next);
}

function onValueChange(v: T) {
  if (multiple) {
    const cur = Array.isArray(value.value) ? [...(value.value as T[])] : [];
    const idx = cur.findIndex(i => valueComparator(i, v, by));
    if (idx === -1) cur.push(v);
    else cur.splice(idx, 1);
    commitValue(cur);
    inputElement.value?.focus();
  }
  else {
    commitValue(v);
    open.value = false;
  }
}

function onOpenChange(next: boolean) {
  open.value = next;
  if (next) {
    isUserInputted.value = false;
    searchTerm.value = '';
    nextTick(() => {
      inputElement.value?.focus();
      highlightSelectedOrFirst();
    });
  }
  else {
    setTimeout(() => {
      if (resetSearchTermOnBlur) searchTerm.value = '';
      isUserInputted.value = false;
    }, 1);
  }
}

function onSelectedValueChange(v: T | undefined, id?: string) {
  selectedValue.value = v;
  selectedValueId.value = id;
}

function getVisibleItemElements(): HTMLElement[] {
  const root = contentElement.value ?? parentElement.value;
  if (!root) return [];
  const all = Array.from(root.querySelectorAll<HTMLElement>('[data-primitives-combobox-item]'));
  const visible: HTMLElement[] = [];
  const filterIds = filterState.value.items;
  for (let i = 0; i < all.length; i++) {
    const el = all[i]!;
    if (el.dataset['disabled'] === '') continue;
    const id = el.id;
    if (!id || filterIds.has(id)) visible.push(el);
  }
  return visible;
}

function readValueFromElement(el: HTMLElement): T | undefined {
  const id = el.id;
  if (!id) return undefined;
  return allItems.value.get(id)?.value;
}

function highlightItemById(id: string | undefined) {
  if (!id) {
    selectedValue.value = undefined;
    selectedValueId.value = undefined;
    return;
  }
  const info = allItems.value.get(id);
  if (!info) return;
  selectedValue.value = info.value;
  selectedValueId.value = id;
  const root = contentElement.value ?? parentElement.value;
  const el = root?.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
  el?.scrollIntoView({ block: 'nearest' });
}

function highlightFirstItem() {
  const els = getVisibleItemElements();
  if (els.length === 0) {
    selectedValue.value = undefined;
    selectedValueId.value = undefined;
    return;
  }
  highlightItemById(els[0]!.id);
}

function highlightSelectedOrFirst() {
  const cur = value.value;
  if (cur !== undefined && !Array.isArray(cur)) {
    for (const [id, info] of allItems.value) {
      if (valueComparator(cur, info.value, by) && !info.disabled) {
        highlightItemById(id);
        return;
      }
    }
  }
  highlightFirstItem();
}

watch(open, (isOpen) => {
  if (!isOpen) {
    selectedValue.value = undefined;
    selectedValueId.value = undefined;
  }
});

function onSearchTermChange(v: string) {
  searchTerm.value = v;
}

function onUserInputtedChange(v: boolean) {
  isUserInputted.value = v;
}

provideComboboxRootContext({
  modelValue: value,
  onValueChange,
  multiple: toRef(() => multiple),
  open,
  onOpenChange,
  disabled: toRef(() => disabled),
  dir: direction,
  name: toRef(() => name),
  required: toRef(() => required),
  by,
  isSelected,

  searchTerm,
  onSearchTermChange,
  resetSearchTermOnBlur: toRef(() => resetSearchTermOnBlur),
  resetSearchTermOnSelect: toRef(() => resetSearchTermOnSelect),
  ignoreFilter: ignoreFilterRef,
  filterFunction: filterRef,
  displayValue: displayValue as ((v: unknown) => string) | undefined,

  isUserInputted,
  onUserInputtedChange,

  contentId,
  triggerElement,
  onTriggerChange: (el) => { triggerElement.value = el; },
  inputElement,
  onInputChange: (el) => { inputElement.value = el; },
  contentElement,
  onContentChange: (el) => { contentElement.value = el; },
  parentElement,
  onParentChange: (el) => { parentElement.value = el; },

  selectedValue,
  selectedValueId,
  onSelectedValueChange,

  allItems,
  onItemRegister,
  onItemUnregister,
  allGroups,
  onGroupRegister,
  onGroupUnregister,
  onGroupItemRegister,
  onGroupItemUnregister,

  filterState,

  getVisibleItemElements,
  highlightItemById,
  highlightFirstItem,
});

defineExpose({
  filterState,
  highlightFirstItem,
  highlightItemById,
  // Avoid unused warnings — surfaced for advanced consumers
  readValueFromElement,
});
</script>

<template>
  <PopperRoot>
    <slot :open="open" :model-value="value" />
    <input
      v-if="name"
      type="hidden"
      :name="name"
      :value="Array.isArray(value) ? JSON.stringify(value) : (value ?? '')"
      :required="required"
      :disabled="disabled"
      aria-hidden="true"
      style="display: none"
      tabindex="-1"
    />
  </PopperRoot>
</template>
