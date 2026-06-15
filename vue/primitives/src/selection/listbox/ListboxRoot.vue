<script lang="ts" generic="T extends ListboxValue = ListboxValue">
import type { ListboxDirection, ListboxOrientation, ListboxSelectionBehavior } from './context';
import type { ListboxValue } from './utils';
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A list of selectable options that supports single or multiple selection,
 * full keyboard navigation (arrows, Home/End, PageUp/PageDown, type-ahead),
 * Shift-range selection, and optional hover highlighting. Use it when you need
 * an always-visible selection list — picking from a set of values, building a
 * custom multi-select, or as the options surface inside a larger widget.
 *
 * The root owns selection state (controlled via `v-model` or uncontrolled
 * via `defaultValue`), the highlighted item, orientation/direction, optional
 * native-form integration (`name`/`required`), and provides context to every
 * descendant part.
 */
export interface ListboxRootProps<U extends ListboxValue = ListboxValue> extends PrimitiveProps {
  /** Uncontrolled initial value. */
  defaultValue?: U | U[];
  /** Allow multiple selection. */
  multiple?: boolean;
  /** Navigation orientation. @default 'vertical' */
  orientation?: ListboxOrientation;
  /** Reading direction. Falls back to `ConfigProvider`. */
  dir?: ListboxDirection;
  /** Disable the whole listbox. */
  disabled?: boolean;
  /** How selection behaves in `multiple` mode. @default 'toggle' */
  selectionBehavior?: ListboxSelectionBehavior;
  /** Highlight items on hover. */
  highlightOnHover?: boolean;
  /** Compare objects by key or custom comparator. */
  by?: string | ((a: U, b: U) => boolean);
  /** Native input name for form submission. When set, a hidden input mirrors the value. */
  name?: string;
  /** Mark as required for native form validation. */
  required?: boolean;
}

export interface ListboxRootEmits<U extends ListboxValue = ListboxValue> {
  highlight: [payload: { ref: HTMLElement; value: U } | undefined];
  entryFocus: [event: CustomEvent];
  leave: [event: Event];
}

export interface ListboxRootSlots<U extends ListboxValue = ListboxValue> {
  default?: (props: { modelValue: U | U[] | undefined }) => unknown;
}
</script>

<script setup lang="ts" generic="T extends ListboxValue = ListboxValue">
import { compareDeep, findValuesBetween, getNextMatch, includesDeep } from './utils';
import { computed, nextTick, ref, shallowRef, toRef, watch } from 'vue';
import { resolveNextIndex, rovingKeyToAction } from '../../internal/utils/roving-focus';
import { Primitive } from '../../internal/primitive';
import type { Ref } from 'vue';
import { provideListboxRootContext } from './context';
import { useCollectionProvider } from '../../utilities/collection';
import { useConfig } from '../../utilities/config-provider';
import { refAutoReset, useForwardExpose } from '@robonen/vue';
import { VisuallyHiddenInput } from '../../utilities/visually-hidden';

const {
  as = 'div',
  defaultValue,
  multiple = false,
  orientation = 'vertical',
  dir,
  disabled = false,
  selectionBehavior = 'toggle',
  highlightOnHover = false,
  by,
  name,
  required = false,
} = defineProps<ListboxRootProps<T>>();

const emit = defineEmits<ListboxRootEmits<T>>();
defineSlots<ListboxRootSlots<T>>();

const model = defineModel<T | T[] | undefined>();

const config = useConfig();
const direction = computed(() => dir ?? config.dir.value);

const initial = (model.value ?? defaultValue) as T | T[] | undefined;
// shallowRef: value is always replaced on commit, never mutated in place.
const localValue = shallowRef<T | T[] | undefined>(
  multiple
    ? (Array.isArray(initial) ? initial.slice() : (initial === undefined ? [] : [initial]))
    : (Array.isArray(initial) ? initial[0] : initial),
) as Ref<T | T[] | undefined>;

watch(model, (v) => {
  if (v === undefined) return;
  const cur = localValue.value;
  if (Array.isArray(v)) {
    if (Array.isArray(cur) && v.length === cur.length) {
      let equal = true;
      for (let i = 0; i < v.length; i++) {
        if (v[i] !== cur[i]) {
          equal = false;
          break;
        }
      }
      if (equal) return;
    }
    localValue.value = v.slice();
  }
  else if (v !== cur) {
    localValue.value = v as T | T[];
  }
});

const highlightedElement = shallowRef<HTMLElement>();
const previousElement = shallowRef<HTMLElement>();
const focusable = ref(true);
const isUserAction = ref(false);
const isComposing = ref(false);
// Anchor for Shift-range selection (multiple + replace).
const firstValue = shallowRef<T>();

const { getItems } = useCollectionProvider();

// Inlined to avoid two intermediate array allocations (.map + .filter) and two closures
// on every call. Called in type-ahead / navigation / enter, which are hot paths.
function enabledEls(): HTMLElement[] {
  const items = getItems(true);
  const out: HTMLElement[] = [];
  for (let i = 0; i < items.length; i++) {
    const el = items[i]!.ref;
    if (el.dataset.disabled !== '') out.push(el);
  }
  return out;
}

function isSelected(value: T): boolean {
  return includesDeep(localValue.value, value, by);
}

// Buffered multi-character type-ahead: accumulates keystrokes, resets ~1s after
// the last one. Repeated single characters cycle through matches; longer
// buffers match by prefix. An item may override its match text via
// `data-text-value` (set by `ListboxItem`'s `textValue` prop).
const searchBuffer = refAutoReset('', 1000);
function textOf(el: HTMLElement): string {
  return el.dataset.textValue ?? el.textContent?.trim() ?? '';
}
function typeAheadMatch(key: string): HTMLElement | undefined {
  const els = enabledEls();
  if (els.length === 0) return undefined;
  searchBuffer.value += key;
  const values = els.map(textOf);
  const current = highlightedElement.value ? textOf(highlightedElement.value) : undefined;
  const next = getNextMatch(values, searchBuffer.value, current);
  if (next === undefined) return undefined;
  return els[values.indexOf(next)];
}

function commit(next: T | T[] | undefined): void {
  localValue.value = next;
  model.value = next;
}

function onValueChange(val: T): void {
  isUserAction.value = true;
  if (multiple) {
    const cur = Array.isArray(localValue.value) ? [...(localValue.value as T[])] : [];
    if (selectionBehavior === 'toggle') {
      const idx = cur.findIndex(i => compareDeep(i, val, by));
      if (idx === -1) cur.push(val);
      else cur.splice(idx, 1);
      commit(cur);
    }
    else {
      firstValue.value = val;
      commit([val]);
    }
  }
  else if (selectionBehavior === 'toggle') {
    commit(compareDeep(localValue.value as T | undefined, val, by) ? undefined : val);
  }
  else {
    commit(val);
  }
  // Reset after the commit-driven watcher flush rather than via a real timer
  // (avoids allocating a timer handle and the 1ms latency).
  nextTick(() => {
    isUserAction.value = false;
  });
}

function changeHighlight(el: HTMLElement | undefined, scrollIntoView = true, focus?: boolean): void {
  if (!el) return;
  highlightedElement.value = el;
  if (focus ?? focusable.value) el.focus({ preventScroll: !scrollIntoView });
  if (scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  const hit = getItems(true).find(i => i.ref === el);
  // getItems is untyped (CollectionItemData<unknown>); a matched item always
  // carries a value, so assert the emit payload shape rather than widen to any.
  emit('highlight', hit as { ref: HTMLElement; value: T } | undefined);
}

function highlightItem(value: T): void {
  const item = getItems(true).find(i => compareDeep(i.value as T, value, by));
  if (item) changeHighlight(item.ref);
}

function onKeydownEnter(event: KeyboardEvent): void {
  const el = highlightedElement.value;
  if (!el || !el.isConnected) return;
  event.preventDefault();
  event.stopPropagation();
  // Do not commit a selection while an IME composition is in progress.
  if (isComposing.value) return;
  el.click();
}

// Apply contiguous range selection for multiple + replace mode on Shift+navigation.
// `targetEl` is the element the highlight is about to move to.
function handleMultipleReplace(event: KeyboardEvent, targetEl: HTMLElement | undefined): void {
  if (selectionBehavior !== 'replace' || !multiple || !Array.isArray(localValue.value)) return;
  const isMetaKey = event.altKey || event.ctrlKey || event.metaKey;
  if (isMetaKey && !event.shiftKey) return;
  if (!event.shiftKey) return;

  const collection = enabledEls();
  const itemOf = (el: HTMLElement | undefined) => getItems(true).find(i => i.ref === el)?.value as T | undefined;

  let lastValue = itemOf(targetEl);
  if (event.key === 'End' || event.key === 'PageDown') lastValue = itemOf(collection.at(-1));
  else if (event.key === 'Home' || event.key === 'PageUp') lastValue = itemOf(collection[0]);

  if (lastValue === undefined || firstValue.value === undefined) return;

  const allValues = getItems(true).map(i => i.value as T);
  const values = findValuesBetween(allValues, firstValue.value, lastValue, by);
  commit(values);
}

function onKeydownNavigation(event: KeyboardEvent): void {
  const intent = rovingKeyToAction(event, { orientation, dir: direction.value, loop: false });
  // Page keys jump to first/last regardless of orientation.
  const isPageUp = event.key === 'PageUp';
  const isPageDown = event.key === 'PageDown';
  if (!intent && !isPageUp && !isPageDown) return;

  const els = enabledEls();
  if (els.length === 0) return;

  let target: HTMLElement | undefined;
  if (isPageUp || intent?.absolute === 'home') {
    target = els[0];
  }
  else if (isPageDown || intent?.absolute === 'end') {
    target = els[els.length - 1];
  }
  else {
    const current = highlightedElement.value;
    const idx = current ? els.indexOf(current) : -1;
    if (idx === -1) {
      target = intent!.delta < 0 ? els[els.length - 1] : els[0];
    }
    else {
      target = els[resolveNextIndex(idx, intent!.delta, els.length, false)];
    }
  }

  handleMultipleReplace(event, target);
  changeHighlight(target);
}

function onKeydownTypeAhead(event: KeyboardEvent): void {
  if (!focusable.value) return;
  isUserAction.value = true;
  if (event.altKey || event.ctrlKey || event.metaKey) {
    if (event.key.toLowerCase() === 'a' && multiple) {
      const all = getItems(true).map(i => i.value) as T[];
      commit(all);
      event.preventDefault();
      const last = enabledEls().at(-1);
      if (last) changeHighlight(last);
    }
    nextTick(() => {
      isUserAction.value = false;
    });
    return;
  }
  if (event.key.length === 1) {
    const el = typeAheadMatch(event.key);
    if (el) changeHighlight(el);
  }
  nextTick(() => {
    isUserAction.value = false;
  });
}

function highlightFirstItem(): void {
  nextTick(() => {
    const el = enabledEls()[0];
    if (el) changeHighlight(el);
  });
}

function onCompositionStart(): void {
  isComposing.value = true;
}
function onCompositionEnd(): void {
  nextTick(() => {
    isComposing.value = false;
  });
}

function onLeave(event: Event): void {
  const el = highlightedElement.value;
  if (el?.isConnected) previousElement.value = el;
  highlightedElement.value = undefined;
  emit('leave', event);
}

function onEnter(event: Event): void {
  const entryFocusEvent = new CustomEvent('listbox.entryFocus', { bubbles: false, cancelable: true });
  (event.currentTarget as HTMLElement | null)?.dispatchEvent(entryFocusEvent);
  emit('entryFocus', entryFocusEvent);
  if (entryFocusEvent.defaultPrevented) return;
  if (previousElement.value?.isConnected) {
    changeHighlight(previousElement.value);
    return;
  }
  const els = enabledEls();
  for (let i = 0; i < els.length; i++) {
    if (els[i]!.dataset.state === 'checked') return changeHighlight(els[i]);
  }
  changeHighlight(els[0]);
}

async function onFocusOut(event: FocusEvent): Promise<void> {
  const target = (event.relatedTarget || event.target) as HTMLElement | null;
  await nextTick();
  if (highlightedElement.value && currentElement.value && !currentElement.value.contains(target)) {
    onLeave(event);
  }
}

function highlightSelected(): void {
  nextTick(() => {
    const els = enabledEls();
    for (let i = 0; i < els.length; i++) {
      if (els[i]!.dataset.state === 'checked') {
        changeHighlight(els[i], true, false);
        return;
      }
    }
  });
}

// localValue is always replaced on commit — no need for deep traversal.
watch(localValue, () => {
  if (isUserAction.value) return;
  highlightSelected();
}, { immediate: true });

provideListboxRootContext({
  modelValue: localValue,
  multiple: toRef(() => multiple),
  orientation: toRef(() => orientation),
  direction,
  disabled: toRef(() => disabled),
  highlightOnHover: toRef(() => highlightOnHover),
  selectionBehavior: toRef(() => selectionBehavior),
  highlightedElement,
  focusable,
  firstValue,
  by,
  onValueChange,
  isSelected,
  changeHighlight,
  onKeydownNavigation,
  onKeydownEnter,
  onKeydownTypeAhead,
  highlightFirstItem,
  onEnter,
  onLeave,
  onCompositionStart,
  onCompositionEnd,
});

// Expose the imperative API before `useForwardExpose` so the latter merges it
// into the forwarded expose (it reads `instance.exposed`), keeping both the
// element ref-forwarding and the imperative API without calling expose() twice.
defineExpose({
  /** The currently highlighted DOM element (or `undefined`). */
  highlightedElement,
  /** Highlight the item whose value matches `value` (uses `by` comparator). */
  highlightItem,
  /** Highlight the first enabled item. */
  highlightFirstItem,
  /** Re-highlight the currently selected item (or the first one). */
  highlightSelected,
  /** Returns the collection items in DOM order. */
  getItems,
});

const { forwardRef, currentElement } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :dir="direction"
    :data-disabled="disabled ? '' : undefined"
    @pointerleave="onLeave"
    @focusout="onFocusOut"
  >
    <slot :model-value="localValue" />

    <VisuallyHiddenInput
      v-if="name"
      :name="name"
      :value="localValue"
      :disabled="disabled"
      :required="required"
    />
  </Primitive>
</template>
