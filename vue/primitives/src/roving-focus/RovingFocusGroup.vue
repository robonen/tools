<script lang="ts">
import type { Direction } from '../config-provider';
import type { Orientation } from './utils';
import type { PrimitiveProps } from '../primitive';
import type { Ref } from 'vue';
import { useContextFactory } from '@robonen/vue';

/**
 * A low-level building block that gives a set of items a single shared tab stop
 * and lets arrow keys "rove" focus between them — the keyboard model behind
 * toolbars, tabs, radio groups, menus and similar widgets. Only one item is in
 * the page tab order at a time; Arrow/Home/End keys move focus and update the
 * current tab stop, honouring `orientation`, writing `dir` (RTL-aware) and
 * optional `loop` wrapping. Wrap focusable children in `RovingFocusItem`; this
 * group renders a thin container and manages entry/exit focus, emitting
 * `entryFocus` so consumers can override where focus lands on first entry.
 */
export interface RovingFocusGroupProps extends PrimitiveProps {
  /** Navigation orientation — decides which arrow keys move focus. */
  orientation?: Orientation;
  /** Writing direction (LTR / RTL). Falls back to `useConfig().dir`. */
  dir?: Direction;
  /**
   * Wrap around at the ends.
   * @default false
   */
  loop?: boolean;
  /** Controlled current tab-stop id. */
  currentTabStopId?: string | null;
  /** Initial current tab-stop id (uncontrolled). */
  defaultCurrentTabStopId?: string;
  /**
   * Prevent scroll when focus enters the group.
   * @default false
   */
  preventScrollOnEntryFocus?: boolean;
}

export interface RovingFocusGroupEmits {
  entryFocus: [event: Event];
}

export interface RovingFocusGroupContext {
  orientation: Ref<Orientation | undefined>;
  dir: Ref<Direction>;
  loop: Ref<boolean>;
  currentTabStopId: Ref<string | null | undefined>;
  onItemFocus: (tabStopId: string) => void;
  onItemShiftTab: () => void;
  onFocusableItemAdd: () => void;
  onFocusableItemRemove: () => void;
}

export const RovingFocusGroupCtx = useContextFactory<RovingFocusGroupContext>(
  'RovingFocusGroupContext',
);
</script>

<script setup lang="ts">
import { ENTRY_FOCUS, EVENT_OPTIONS, focusFirst } from './utils';
import { ref, toRef } from 'vue';
import { Primitive } from '../primitive';
import { useCollectionProvider } from '../collection';
import { useConfig } from '../config-provider';

const {
  orientation,
  dir,
  loop = false,
  currentTabStopId: currentTabStopIdProp,
  defaultCurrentTabStopId,
  preventScrollOnEntryFocus = false,
  as = 'div',
} = defineProps<RovingFocusGroupProps>();

const emit = defineEmits<RovingFocusGroupEmits>();

const config = useConfig();
// `dir` falls back to the provider's configured direction when not given as prop.
const dirRef = toRef(() => dir ?? config.dir.value);
const orientationRef = toRef(() => orientation);
const loopRef = toRef(() => loop);

const currentTabStopId = ref<string | null | undefined>(
  currentTabStopIdProp ?? defaultCurrentTabStopId,
);

const isTabbingBackOut = ref(false);
const isClickFocus = ref(false);
const focusableItemsCount = ref(0);

const { getItems, CollectionSlot } = useCollectionProvider();

function handleFocus(event: FocusEvent): void {
  const isKeyboardFocus = !isClickFocus.value;

  if (
    event.currentTarget
    && event.target === event.currentTarget
    && isKeyboardFocus
    && !isTabbingBackOut.value
  ) {
    const entryFocusEvent = new CustomEvent(ENTRY_FOCUS, EVENT_OPTIONS);
    event.currentTarget.dispatchEvent(entryFocusEvent);
    emit('entryFocus', entryFocusEvent);

    if (!entryFocusEvent.defaultPrevented) {
      const items = getItems()
        .map(i => i.ref)
        .filter(i => i.dataset['disabled'] !== '');
      const activeItem = items.find(item => item.getAttribute('data-active') === '');
      const currentItem = items.find(item => item.id === currentTabStopId.value);
      const candidateItems = [activeItem, currentItem, ...items].filter(
        Boolean,
      ) as HTMLElement[];
      focusFirst(candidateItems, preventScrollOnEntryFocus);
    }
  }
  isClickFocus.value = false;
}

function handleMouseUp(): void {
  setTimeout(() => {
    isClickFocus.value = false;
  }, 1);
}

defineExpose({ getItems });

RovingFocusGroupCtx.provide({
  loop: loopRef,
  dir: dirRef,
  orientation: orientationRef,
  currentTabStopId,
  onItemFocus: (tabStopId: string) => {
    currentTabStopId.value = tabStopId;
  },
  onItemShiftTab: () => {
    isTabbingBackOut.value = true;
  },
  onFocusableItemAdd: () => {
    focusableItemsCount.value++;
  },
  onFocusableItemRemove: () => {
    focusableItemsCount.value--;
  },
});
</script>

<template>
  <CollectionSlot>
    <Primitive
      :tabindex="isTabbingBackOut || focusableItemsCount === 0 ? -1 : 0"
      :data-orientation="orientation"
      :as="as"
      :dir="dirRef"
      style="outline: none"
      @mousedown="isClickFocus = true"
      @mouseup="handleMouseUp"
      @focus="handleFocus"
      @blur="isTabbingBackOut = false"
    >
      <slot />
    </Primitive>
  </CollectionSlot>
</template>
