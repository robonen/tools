<script lang="ts" generic="T">
import type { FlatItem } from './utils';
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A single node within a `TreeRoot`, rendered once per visible `flatItem`.
 * Handles click-to-select, click-to-toggle for parents, keyboard interaction,
 * and the ARIA treeitem attributes (level, set size/position, selected,
 * expanded). Exposes `isExpanded` / `isSelected` / `isIndeterminate` /
 * `isDisabled` plus imperative `handleSelect` / `handleToggle` callbacks to its
 * slot, so custom sub-nodes (a chevron, a checkbox) can drive state
 * independently.
 *
 * `select` and `toggle` are emitted as cancelable events before the root
 * mutates state — call `event.preventDefault()` to veto.
 */
export interface TreeItemProps<U = unknown> extends PrimitiveProps {
  /** Flattened item produced by `TreeRoot` (from its default slot). */
  item: FlatItem<U>;
  /** Disable this specific item. */
  disabled?: boolean;
}

export interface TreeItemSelectEventDetail<U = unknown> {
  originalEvent: Event;
  value: U;
  isExpanded: boolean;
  isSelected: boolean;
}

export type TreeItemSelectEvent<U = unknown> = CustomEvent<TreeItemSelectEventDetail<U>>;
export type TreeItemToggleEvent<U = unknown> = CustomEvent<TreeItemSelectEventDetail<U>>;

export interface TreeItemEmits<U = unknown> {
  /** Fired before selection — cancelable via `event.preventDefault()`. */
  select: [event: TreeItemSelectEvent<U>];
  /** Fired before expand/collapse — cancelable via `event.preventDefault()`. */
  toggle: [event: TreeItemToggleEvent<U>];
}
</script>

<script setup lang="ts" generic="T">
import { computed } from 'vue';
import { useCollectionInjector } from '../../utilities/collection';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { useTreeContext } from './context';

const { as = 'li', item, disabled = false } = defineProps<TreeItemProps<T>>();

const emit = defineEmits<TreeItemEmits<T>>();

const ctx = useTreeContext();
const { CollectionItem } = useCollectionInjector();

const isDisabled = computed(() => ctx.disabled.value || disabled);
const isExpanded = computed(() => item.hasChildren && ctx.isExpanded(item.key));
const isSelected = computed(() => ctx.isSelected(item.key));
const isIndeterminate = computed(() => ctx.isIndeterminate(item as FlatItem<T>));

// Single-tabstop roving tabindex — only the current tab stop is reachable by
// Tab; the rest are -1 and reached via arrow keys.
const isTabStop = computed(() => ctx.currentTabStopKey.value === item.key);
const tabindex = computed(() => {
  if (isDisabled.value) return -1;
  return isTabStop.value ? 0 : -1;
});

function dispatchSelect(originalEvent: Event): boolean {
  const event = new CustomEvent('select', {
    bubbles: false,
    cancelable: true,
    detail: {
      originalEvent,
      value: item.value as T,
      isExpanded: isExpanded.value,
      isSelected: isSelected.value,
    },
  }) as TreeItemSelectEvent<T>;
  emit('select', event);
  return !event.defaultPrevented;
}

function dispatchToggle(originalEvent: Event): boolean {
  const event = new CustomEvent('toggle', {
    bubbles: false,
    cancelable: true,
    detail: {
      originalEvent,
      value: item.value as T,
      isExpanded: isExpanded.value,
      isSelected: isSelected.value,
    },
  }) as TreeItemToggleEvent<T>;
  emit('toggle', event);
  return !event.defaultPrevented;
}

function runSelect(originalEvent: Event): void {
  if (isDisabled.value) return;
  if (dispatchSelect(originalEvent)) ctx.select(item.value as T);
}

function runToggle(originalEvent: Event): void {
  if (isDisabled.value || !item.hasChildren) return;
  if (dispatchToggle(originalEvent)) ctx.toggleExpanded(item.value as T);
}

function onClick(event: MouseEvent): void {
  if (isDisabled.value) return;
  event.stopPropagation();
  runSelect(event);
  if (item.hasChildren) runToggle(event);
}

function onKeyDown(event: KeyboardEvent): void {
  if (isDisabled.value || !currentElement.value) return;
  // Enter / Space dispatch the cancelable select event first; the root handles
  // navigation keys. We intercept selection keys here to support preventDefault.
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    runSelect(event);
    return;
  }
  ctx.onItemKeyDown(event, currentElement.value, item);
}

function onFocus(): void {
  if (isDisabled.value) return;
  ctx.setTabStop(item.key);
}

// Slot-facing imperative callbacks — let a custom chevron/checkbox drive state.
function handleSelect(): void {
  runSelect(new Event('select'));
}
function handleToggle(): void {
  runToggle(new Event('toggle'));
}

// `defineExpose` must run BEFORE `useForwardExpose`: the composable absorbs a
// prior expose and merges these slot-facing members alongside the forwarded
// element ref (mirrors ComboboxItem/AccordionItem).
defineExpose({
  isExpanded,
  isSelected,
  isIndeterminate,
  isDisabled,
  handleSelect,
  handleToggle,
});

const { forwardRef, currentElement } = useForwardExpose();
</script>

<template>
  <CollectionItem>
    <Primitive
      :ref="forwardRef"
      :as="as"
      role="treeitem"
      :tabindex="tabindex"
      :aria-level="item.level"
      :aria-setsize="item.setSize"
      :aria-posinset="item.posInSet"
      :aria-selected="isSelected"
      :aria-expanded="item.hasChildren ? isExpanded : undefined"
      :aria-disabled="isDisabled || undefined"
      :data-state="item.hasChildren ? (isExpanded ? 'open' : 'closed') : undefined"
      :data-selected="isSelected ? '' : undefined"
      :data-indeterminate="isIndeterminate ? '' : undefined"
      :data-disabled="isDisabled ? '' : undefined"
      :data-level="item.level"
      :data-key="item.key"
      @click="onClick"
      @keydown="onKeyDown"
      @focus="onFocus"
    >
      <slot
        :item="item"
        :is-expanded="isExpanded"
        :is-selected="isSelected"
        :is-indeterminate="isIndeterminate"
        :is-disabled="isDisabled"
        :handle-select="handleSelect"
        :handle-toggle="handleToggle"
      />
    </Primitive>
  </CollectionItem>
</template>
