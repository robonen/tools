<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * A single focusable item within a `RovingFocusGroup`. It registers itself with
 * the group's collection, exposes itself as the sole tab stop when current
 * (`tabindex="0"`, others `-1`), and handles the arrow-key navigation that moves
 * focus to its siblings. Use `focusable` to opt an item out of the tab order and
 * `active` to mark the current selection so it gets focus on group entry.
 */
export interface RovingFocusItemProps extends PrimitiveProps {
  /** Unique tab-stop id. Auto-generated via config `useId` when omitted. */
  tabStopId?: string;
  /**
   * Whether this item is focusable.
   * @default true
   */
  focusable?: boolean;
  /** Marks the item as active (current selection). */
  active?: boolean;
  /**
   * Allow `Shift+Arrow` for navigation.
   * @default false
   */
  allowShiftKey?: boolean;
}
</script>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted } from 'vue';
import { focusFirst, getFocusIntent, wrapArray } from './utils';
import { Primitive } from '../primitive';
import { RovingFocusGroupCtx } from './RovingFocusGroup.vue';
import { useCollectionInjector } from '../collection';
import { useId } from '../config-provider';

const {
  tabStopId,
  focusable = true,
  active = false,
  allowShiftKey = false,
  as = 'span',
} = defineProps<RovingFocusItemProps>();

const context = RovingFocusGroupCtx.inject();
// `useId` returns a `ComputedRef<string>` in this repo — unwrap where needed.
const autoId = useId();
const id = computed(() => tabStopId ?? autoId.value);
const isCurrentTabStop = computed(() => context.currentTabStopId.value === id.value);

const { getItems, CollectionItem } = useCollectionInjector();

onMounted(() => {
  if (focusable) context.onFocusableItemAdd();
});

onUnmounted(() => {
  if (focusable) context.onFocusableItemRemove();
});

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Tab' && event.shiftKey) {
    context.onItemShiftTab();
    return;
  }

  if (event.target !== event.currentTarget) return;

  const focusIntent = getFocusIntent(event, context.orientation.value, context.dir.value);
  if (focusIntent === undefined) return;

  if (
    event.metaKey
    || event.ctrlKey
    || event.altKey
    || (allowShiftKey ? false : event.shiftKey)
  )
    return;

  event.preventDefault();

  let candidateNodes = getItems()
    .map(i => i.ref)
    .filter(i => i.dataset['disabled'] !== '');

  if (focusIntent === 'last') {
    candidateNodes.reverse();
  }
  else if (focusIntent === 'prev' || focusIntent === 'next') {
    if (focusIntent === 'prev') candidateNodes.reverse();

    const currentIndex = candidateNodes.indexOf(event.currentTarget as HTMLElement);

    candidateNodes = context.loop.value
      ? wrapArray(candidateNodes, currentIndex + 1)
      : candidateNodes.slice(currentIndex + 1);
  }

  nextTick(() => focusFirst(candidateNodes));
}

function handleMousedown(event: MouseEvent): void {
  if (!focusable) event.preventDefault();
  else context.onItemFocus(id.value);
}
</script>

<template>
  <CollectionItem>
    <Primitive
      :tabindex="isCurrentTabStop ? 0 : -1"
      :data-orientation="context.orientation.value"
      :data-active="active ? '' : undefined"
      :data-disabled="!focusable ? '' : undefined"
      :as="as"
      @mousedown="handleMousedown"
      @focus="context.onItemFocus(id)"
      @keydown="handleKeydown"
    >
      <slot />
    </Primitive>
  </CollectionItem>
</template>
