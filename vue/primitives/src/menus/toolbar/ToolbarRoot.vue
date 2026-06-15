<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';
import type { RovingDirection } from '../../internal/utils/roving-focus';

/**
 * A container that groups a set of controls — buttons, toggles, links,
 * separators — into a single keyboard-navigable strip (`role="toolbar"`). Like
 * an editor's formatting bar, the whole toolbar is one tab stop: Tab moves into
 * it, then arrow keys roam between items (Home/End and PageUp/PageDown jump to
 * the ends), with optional wrap-around via `loop`. It owns the roving-focus
 * state, exposes `data-orientation` for styling, and provides context to every
 * `ToolbarButton`, `ToolbarLink`, `ToolbarToggleGroup` and `ToolbarSeparator`.
 * Reach for it to assemble action bars, formatting toolbars, or any cluster of
 * related controls.
 */
export interface ToolbarRootProps extends PrimitiveProps {
  orientation?: 'horizontal' | 'vertical';
  /**
   * Writing direction. When omitted, inherits from a `ConfigProvider`,
   * falling back to `'ltr'`.
   */
  dir?: RovingDirection;
  loop?: boolean;
  /**
   * Controlled id of the item that currently holds the tab stop. Bind with
   * `v-model:currentTabStopId`. When unbound the toolbar tracks it internally.
   */
  currentTabStopId?: string | null;
  /** Initial current tab-stop id (uncontrolled). */
  defaultCurrentTabStopId?: string;
  /**
   * Prevent scrolling the item into view when focus first enters the toolbar.
   * @default false
   */
  preventScrollOnEntryFocus?: boolean;
}

export interface ToolbarRootEmits {
  /**
   * Fired the first time keyboard focus enters the toolbar. Call
   * `event.preventDefault()` to override the default entry-focus target.
   */
  entryFocus: [event: Event];
  /** Backs `v-model:currentTabStopId`. */
  'update:currentTabStopId': [value: string | null | undefined];
}
</script>

<script setup lang="ts">
import { computed, ref, toRef, watchSyncEffect } from 'vue';
import { resolveNextIndex, rovingKeyToAction } from '../../internal/utils/roving-focus';
import { useCollectionProvider } from '../../utilities/collection';
import { useForwardExpose } from '@robonen/vue';
import { useDirection } from '../../utilities/config-provider';
import { Primitive } from '../../internal/primitive';
import { TOOLBAR_COLLECTION_KEY, provideToolbarContext } from './context';

const {
  orientation = 'horizontal',
  dir,
  loop = true,
  defaultCurrentTabStopId,
  preventScrollOnEntryFocus = false,
  as = 'div',
} = defineProps<ToolbarRootProps>();

const emit = defineEmits<ToolbarRootEmits>();

const { forwardRef } = useForwardExpose();

// `dir` falls back to the active `ConfigProvider` direction when not given as a
// prop, so app-wide RTL config reaches the toolbar automatically.
const direction = useDirection(() => dir);

// DOM-order items via Collection primitive. Survives `v-for` reorders and
// teleport/portal children, unlike a mount-order array.
// Enabled-only: a disabled button is unfocusable, so letting it into the
// roving list would freeze navigation on it and drop the toolbar's tab stop.
const { getItems, CollectionSlot } = useCollectionProvider(TOOLBAR_COLLECTION_KEY);
const items = computed(() => getItems().map(i => i.ref));

const activeIndex = ref(0);

// Controlled / uncontrolled current tab stop. The local ref drives the toolbar
// when the parent does not bind `v-model:currentTabStopId`; otherwise the
// external value is the source of truth and writes still emit the update.
const localTabStopId = ref<string | null | undefined>(defaultCurrentTabStopId);
// eslint-disable-next-line vue/no-dupe-keys
const currentTabStopId = defineModel<string | null | undefined>('currentTabStopId', {
  default: undefined,
  get: external => external ?? localTabStopId.value,
  set: (value) => {
    localTabStopId.value = value;
    return value;
  },
});

// Group reachability: when the user tabs back out (Shift+Tab) we drop the group
// from the tab order until focus returns; when every item is disabled there is
// no roving item, so the group itself becomes the single tab stop instead of the
// toolbar silently leaving the tab sequence.
const isTabbingBackOut = ref(false);

// Read fresh rather than through `items`: `getItems` filters on live
// `data-disabled`, which the computed cannot track across runtime toggles.
function enabledItems(): HTMLElement[] {
  return getItems().map(i => i.ref);
}

const groupTabindex = computed(() =>
  isTabbingBackOut.value || items.value.length === 0 ? -1 : 0,
);

function focusIndex(i: number): void {
  const el = enabledItems()[i];
  if (!el) return;
  el.focus({ preventScroll: preventScrollOnEntryFocus });
  // Commit only when focus actually landed, so the tab stop never moves
  // onto an element that refused focus.
  if (document.activeElement === el) {
    activeIndex.value = i;
    currentTabStopId.value = el.id || null;
  }
}

function onItemFocus(el: HTMLElement): void {
  const idx = enabledItems().indexOf(el);
  if (idx === -1) return;
  activeIndex.value = idx;
  currentTabStopId.value = el.id || null;
}

function onItemShiftTab(): void {
  isTabbingBackOut.value = true;
}

function onItemKeyDown(event: KeyboardEvent, el: HTMLElement): void {
  // A keydown bubbling up from a descendant (e.g. an input nested in a custom
  // item) must not be hijacked for roving navigation.
  if (event.target !== event.currentTarget) return;

  const action = rovingKeyToAction(event, { orientation, dir: direction.value, loop });
  // `rovingKeyToAction` only handles Arrow/Home/End; map PageUp/PageDown to the
  // first/last enabled item locally (the shared util is intentionally minimal).
  const pageAbsolute = event.key === 'PageUp'
    ? 'home'
    : event.key === 'PageDown' ? 'end' : undefined;
  if (!action && !pageAbsolute) return;

  // Leave browser/OS shortcuts (Ctrl+Home, etc.) untouched.
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;

  event.preventDefault();
  const list = enabledItems();
  const idx = list.indexOf(el);
  const absolute = action?.absolute ?? pageAbsolute;
  if (absolute === 'home') return focusIndex(0);
  if (absolute === 'end') return focusIndex(list.length - 1);
  focusIndex(resolveNextIndex(idx, action!.delta, list.length, loop));
}

// Entry focus: when keyboard focus first lands on the group element, redirect it
// to the current / first enabled item instead of resting on the wrapper. A
// mouse-driven focus skips this so clicking an item keeps that item focused.
const isClickFocus = ref(false);

function handleGroupFocus(event: FocusEvent): void {
  const isKeyboardFocus = !isClickFocus.value;
  if (
    event.currentTarget
    && event.target === event.currentTarget
    && isKeyboardFocus
    && !isTabbingBackOut.value
  ) {
    const entryFocusEvent = new CustomEvent('toolbar.entryFocus', {
      bubbles: false,
      cancelable: true,
    });
    event.currentTarget.dispatchEvent(entryFocusEvent);
    emit('entryFocus', entryFocusEvent);

    if (!entryFocusEvent.defaultPrevented) {
      const list = enabledItems();
      const current = list.find(el => el.id && el.id === currentTabStopId.value);
      const target = current ?? list[activeIndex.value] ?? list[0];
      if (target) target.focus({ preventScroll: preventScrollOnEntryFocus });
    }
  }
  isClickFocus.value = false;
}

function handleGroupMouseUp(): void {
  // Reset after a tick: a click may not raise a focus event on the wrapper.
  setTimeout(() => {
    isClickFocus.value = false;
  }, 1);
}

// Keep the committed tab stop pointing at a still-enabled item: if items are
// toggled disabled at runtime, fall back to the first enabled one.
watchSyncEffect(() => {
  const list = items.value;
  if (list.length === 0) return;
  if (activeIndex.value >= list.length) activeIndex.value = 0;
});

provideToolbarContext({
  // Identity passthroughs via `toRef` — reactive without `computed`'s effect/cache.
  orientation: toRef(() => orientation),
  direction,
  loop: toRef(() => loop),
  items,
  activeIndex,
  focusIndex,
  onItemKeyDown,
  onItemFocus,
  onItemShiftTab,
});
</script>

<template>
  <CollectionSlot>
    <Primitive
      :ref="forwardRef"
      :as="as"
      role="toolbar"
      :tabindex="groupTabindex"
      :aria-orientation="orientation"
      :dir="direction"
      :data-orientation="orientation"
      style="outline: none"
      @mousedown="isClickFocus = true"
      @mouseup="handleGroupMouseUp"
      @focus="handleGroupFocus"
      @blur="isTabbingBackOut = false"
    >
      <slot />
    </Primitive>
  </CollectionSlot>
</template>
