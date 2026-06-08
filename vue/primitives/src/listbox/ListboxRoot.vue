<script lang="ts" generic="T extends ListboxValue = ListboxValue">
import type { ListboxDirection, ListboxOrientation, ListboxSelectionBehavior } from './context';
import type { ListboxValue } from './utils';
import type { PrimitiveProps } from '../primitive';

export interface ListboxRootProps<U extends ListboxValue = ListboxValue> extends PrimitiveProps {
  /** Controlled value. Use `v-model`. */
  modelValue?: U | U[];
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
}

export interface ListboxRootEmits<U extends ListboxValue = ListboxValue> {
  'update:modelValue': [value: U | U[] | undefined];
  highlight: [payload: { ref: HTMLElement; value: U } | undefined];
  entryFocus: [event: CustomEvent];
  leave: [event: Event];
}
</script>

<script setup lang="ts" generic="T extends ListboxValue = ListboxValue">
import { compare, includes } from './utils';
import { computed, nextTick, ref, shallowRef, toRef, watch } from 'vue';
import { resolveNextIndex, rovingKeyToAction } from '../utils/roving-focus';
import { Primitive } from '../primitive';
import type { Ref } from 'vue';
import { provideListboxRootContext } from './context';
import { useCollectionProvider } from '../collection';
import { useConfig } from '../config-provider';
import { useForwardExpose } from '@robonen/vue';

const {
  as = 'div',
  modelValue,
  defaultValue,
  multiple = false,
  orientation = 'vertical',
  dir,
  disabled = false,
  selectionBehavior = 'toggle',
  highlightOnHover = false,
  by,
} = defineProps<ListboxRootProps<T>>();

const emit = defineEmits<ListboxRootEmits<T>>();

const { forwardRef, currentElement } = useForwardExpose();
const config = useConfig();
const direction = computed(() => dir ?? config.dir.value);

const initial = (modelValue ?? defaultValue) as T | T[] | undefined;
// shallowRef: value is always replaced on commit, never mutated in place.
const localValue = shallowRef<T | T[] | undefined>(
  multiple
    ? (Array.isArray(initial) ? initial.slice() : (initial === undefined ? [] : [initial]))
    : (Array.isArray(initial) ? initial[0] : initial),
) as Ref<T | T[] | undefined>;

watch(() => modelValue, (v) => {
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
    localValue.value = v as any;
  }
});

const highlightedElement = shallowRef<HTMLElement>();
const previousElement = shallowRef<HTMLElement>();
const focusable = ref(true);
const isUserAction = ref(false);

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
  return includes(localValue.value, value, by);
}

function commit(next: T | T[] | undefined): void {
  localValue.value = next;
  emit('update:modelValue', next);
}

function onValueChange(val: T): void {
  isUserAction.value = true;
  if (multiple) {
    const cur = Array.isArray(localValue.value) ? [...(localValue.value as T[])] : [];
    if (selectionBehavior === 'toggle') {
      const idx = cur.findIndex(i => compare(i, val, by));
      if (idx === -1) cur.push(val);
      else cur.splice(idx, 1);
      commit(cur);
    }
    else {
      commit([val]);
    }
  }
  else if (selectionBehavior === 'toggle') {
    commit(compare(localValue.value as T | undefined, val, by) ? undefined : val);
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
  emit('highlight', hit as any);
}

function onKeydownEnter(event: KeyboardEvent): void {
  const el = highlightedElement.value;
  if (!el || !el.isConnected) return;
  event.preventDefault();
  event.stopPropagation();
  el.click();
}

function onKeydownNavigation(event: KeyboardEvent): void {
  const intent = rovingKeyToAction(event, { orientation, dir: direction.value, loop: false });
  if (!intent) return;
  const els = enabledEls();
  if (els.length === 0) return;

  if (intent.absolute === 'home') return changeHighlight(els[0]);
  if (intent.absolute === 'end') return changeHighlight(els[els.length - 1]);

  const current = highlightedElement.value;
  const idx = current ? els.indexOf(current) : -1;
  if (idx === -1) {
    changeHighlight(intent.delta < 0 ? els[els.length - 1] : els[0]);
    return;
  }
  const next = resolveNextIndex(idx, intent.delta, els.length, false);
  changeHighlight(els[next]);
}

function onKeydownTypeAhead(event: KeyboardEvent): void {
  if (!focusable.value) return;
  if (event.altKey || event.ctrlKey || event.metaKey) {
    if (event.key.toLowerCase() === 'a' && multiple) {
      const all = getItems(true).map(i => i.value) as T[];
      commit(all);
      event.preventDefault();
      const last = enabledEls().at(-1);
      if (last) changeHighlight(last);
    }
    return;
  }
  if (event.key.length !== 1) return;
  const letter = event.key.toLowerCase();
  const els = enabledEls();
  const len = els.length;
  if (len === 0) return;
  const start = highlightedElement.value ? els.indexOf(highlightedElement.value) + 1 : 0;
  for (let i = 0; i < len; i++) {
    const el = els[(start + i) % len]!;
    const text = el.textContent;
    if (text && text.trim().toLowerCase().startsWith(letter)) {
      changeHighlight(el);
      return;
    }
  }
}

function highlightFirstItem(): void {
  nextTick(() => {
    const el = enabledEls()[0];
    if (el) changeHighlight(el);
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

// localValue is always replaced on commit — no need for deep traversal.
watch(localValue, () => {
  if (isUserAction.value) return;
  nextTick(() => {
    const els = enabledEls();
    for (let i = 0; i < els.length; i++) {
      if (els[i]!.dataset.state === 'checked') {
        changeHighlight(els[i], true, false);
        return;
      }
    }
  });
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
});
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
  </Primitive>
</template>
