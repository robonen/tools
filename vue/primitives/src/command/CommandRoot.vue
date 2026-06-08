<script lang="ts">
import type { PrimitiveProps } from '../primitive';
import type { CommandFilterFunction } from './utils';

export interface CommandRootProps extends PrimitiveProps {
  /** Controlled selected value. Use `v-model`. */
  modelValue?: string;
  /** Uncontrolled initial selected value. */
  defaultValue?: string;
  /** Controlled search term. Use `v-model:searchTerm`. */
  searchTerm?: string;
  /** Uncontrolled initial search term. */
  defaultSearchTerm?: string;
  /** Custom scoring filter. Returns 0..1 (0 = hide). */
  filter?: CommandFilterFunction;
  /** Run the filter automatically. Set false to perform filtering yourself. @default true */
  shouldFilter?: boolean;
  /** Loop keyboard navigation at the ends of the list. @default false */
  loop?: boolean;
  /** Accessible label announced to assistive tech. */
  label?: string;
}

export interface CommandRootEmits {
  'update:modelValue': [value: string | undefined];
  'update:searchTerm': [value: string];
}
</script>

<script setup lang="ts">
import { computed, ref, shallowRef, toRef, triggerRef, watch } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { useId } from '../config-provider';
import { Primitive } from '../primitive';
import { VisuallyHidden } from '../visually-hidden';
import { provideCommandContext } from './context';
import type { CommandItemInfo } from './context';
import { COMMAND_ITEM_ATTR, COMMAND_VALUE_ATTR, defaultFilter } from './utils';

defineOptions({ inheritAttrs: false });

const {
  as = 'div',
  defaultValue,
  defaultSearchTerm = '',
  filter,
  shouldFilter = true,
  loop = false,
  label,
} = defineProps<CommandRootProps>();

const emit = defineEmits<CommandRootEmits>();

const { forwardRef } = useForwardExpose();

const localValue = ref<string | undefined>(defaultValue);
const value = defineModel<string | undefined>('modelValue', {
  default: undefined,
  get: v => v ?? localValue.value,
  set: (v) => {
    localValue.value = v;
    return v;
  },
});

const localSearch = ref<string>(defaultSearchTerm);
const search = defineModel<string>('searchTerm', {
  default: undefined,
  get: v => v ?? localSearch.value,
  set: (v) => {
    localSearch.value = v;
    return v;
  },
});

const selectedValue = ref<string | undefined>(undefined);

const listId = useId(undefined, 'command-list');
const labelId = useId(undefined, 'command-label');

const listElement = shallowRef<HTMLElement | undefined>(undefined);

const allItems = shallowRef(new Map<string, CommandItemInfo>());
const allGroups = shallowRef(new Map<string, Set<string>>());

function registerItem(info: CommandItemInfo) {
  allItems.value.set(info.value, info);
  triggerRef(allItems);
}

function unregisterItem(value: string) {
  if (allItems.value.delete(value)) triggerRef(allItems);
  if (selectedValue.value === value) selectedValue.value = undefined;
}

function registerGroup(groupId: string) {
  if (!allGroups.value.has(groupId)) {
    allGroups.value.set(groupId, new Set());
    triggerRef(allGroups);
  }
}

function unregisterGroup(groupId: string) {
  if (allGroups.value.delete(groupId)) triggerRef(allGroups);
}

function registerGroupItem(groupId: string, val: string) {
  let set = allGroups.value.get(groupId);
  if (!set) {
    set = new Set();
    allGroups.value.set(groupId, set);
  }
  set.add(val);
  triggerRef(allGroups);
}

function unregisterGroupItem(groupId: string, val: string) {
  const set = allGroups.value.get(groupId);
  if (set?.delete(val)) triggerRef(allGroups);
}

const filterRef = toRef(() => filter);
const shouldFilterRef = toRef(() => shouldFilter);

const filteredItems = computed<Map<string, number>>(() => {
  const out = new Map<string, number>();
  const term = search.value;
  const useFilter = shouldFilterRef.value && term.length > 0;
  const fn = filterRef.value ?? defaultFilter;

  for (const [val, info] of allItems.value) {
    const score = useFilter ? fn(val, term, info.keywords) : 1;
    if (score > 0) out.set(val, score);
  }
  return out;
});

function escapeAttr(v: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(v);
  return v.replaceAll(/["\\]/g, '\\$&');
}

function getSelectableItems(): string[] {
  const filtered = filteredItems.value;
  const root = listElement.value;

  const candidates: Array<{ value: string; score: number; idx: number }> = [];

  if (root) {
    const els = Array.from(root.querySelectorAll<HTMLElement>(`[${COMMAND_ITEM_ATTR}]`));
    const indexOf = new Map<string, number>();
    for (let i = 0; i < els.length; i++) {
      const v = els[i]!.getAttribute(COMMAND_VALUE_ATTR);
      if (v !== null) indexOf.set(v, i);
    }
    for (const [val, score] of filtered) {
      const info = allItems.value.get(val);
      if (!info || info.disabled) continue;
      candidates.push({ value: val, score, idx: indexOf.get(val) ?? Number.MAX_SAFE_INTEGER });
    }
  }
  else {
    let i = 0;
    for (const [val, score] of filtered) {
      const info = allItems.value.get(val);
      if (!info || info.disabled) continue;
      candidates.push({ value: val, score, idx: i++ });
    }
  }

  candidates.sort((a, b) => b.score - a.score || a.idx - b.idx);
  return candidates.map(c => c.value);
}

function getItemId(val: string): string {
  return `${listId.value}-item-${escapeAttr(val)}`;
}

function setModelValue(v: string | undefined) {
  value.value = v;
  emit('update:modelValue', v);
}

function setSearchTerm(v: string) {
  search.value = v;
  emit('update:searchTerm', v);
}

function setSelectedValue(v: string | undefined) {
  selectedValue.value = v;
}

function setListElement(el: HTMLElement | undefined) {
  listElement.value = el;
}

function commitSelected() {
  const v = selectedValue.value;
  if (v === undefined) return;
  const info = allItems.value.get(v);
  if (!info || info.disabled) return;
  setModelValue(v);
  info.onSelect?.();
}

// Auto-highlight the highest-scored visible item when items or search change.
watch(
  [() => search.value, filteredItems, allItems],
  () => {
    const current = selectedValue.value;
    if (current && filteredItems.value.has(current)) {
      const info = allItems.value.get(current);
      if (info && !info.disabled) return;
    }
    const items = getSelectableItems();
    selectedValue.value = items[0];
  },
  { flush: 'post' },
);

const announceCount = computed(() => {
  const n = filteredItems.value.size;
  return n === 1 ? '1 result available.' : `${n} results available.`;
});

provideCommandContext({
  modelValue: value,
  setModelValue,
  searchTerm: search,
  setSearchTerm,
  selectedValue,
  setSelectedValue,
  shouldFilter: toRef(() => shouldFilter),
  loop: toRef(() => loop),
  filterFunction: filterRef,
  listId,
  labelId,
  getItemId,
  allItems,
  filteredItems,
  registerItem,
  unregisterItem,
  allGroups,
  registerGroup,
  unregisterGroup,
  registerGroupItem,
  unregisterGroupItem,
  listElement,
  setListElement,
  getSelectableItems,
  commitSelected,
});

defineExpose({
  filteredItems,
  getSelectableItems,
  selectedValue,
  setSelectedValue,
  commitSelected,
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="application"
    :aria-label="label"
    :aria-labelledby="label ? undefined : labelId"
    data-primitives-command-root
    v-bind="$attrs"
  >
    <VisuallyHidden :id="labelId" aria-hidden="true">
      {{ label ?? 'Command palette' }}
    </VisuallyHidden>
    <VisuallyHidden role="status" aria-live="polite">
      {{ announceCount }}
    </VisuallyHidden>
    <slot
      :search-term="search"
      :selected-value="selectedValue"
      :model-value="value"
      :filtered-count="filteredItems.size"
    />
  </Primitive>
</template>
