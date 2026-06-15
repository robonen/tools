<script lang="ts" generic="T">
import type { FlatItem } from './utils';
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A hierarchical list of expandable/collapsible nodes with full keyboard
 * support. Use it to present nested data — file explorers, navigation
 * sidebars, category pickers, or any place users drill into parent/child
 * relationships. Works with either nested or flat source data via the
 * `getKey` / `getChildren` accessors.
 *
 * The root owns selection state (single or multiple, controlled via
 * `v-model` or uncontrolled via `defaultValue`), expanded state
 * (`v-model:expanded`), roving focus and arrow/Home/End navigation, and
 * exposes the computed visible `flatItems` through its default slot for
 * each `TreeItem` to render.
 */
export interface TreeRootProps<U = unknown> extends PrimitiveProps {
  /** Flat or nested item list — children are resolved via `getChildren`. */
  items: readonly U[];
  /** Extract a stable unique string key from an item. */
  getKey: (item: U) => string;
  /** Return the children of an item, or `undefined` if it is a leaf. */
  getChildren?: (item: U) => readonly U[] | undefined | null;
  /**
   * Return the text label of an item for type-ahead matching. Defaults to the
   * rendered `textContent` of the item element — supply this for non-text nodes
   * (icons-only) or to override the matched string.
   */
  getLabel?: (item: U) => string;
  /** Uncontrolled initial selected key(s). */
  defaultValue?: string | string[];
  /** Uncontrolled initial expanded keys. */
  defaultExpanded?: string[];
  /** Allow selecting multiple items. @default false */
  multiple?: boolean;
  /** Disable the entire tree. */
  disabled?: boolean;
  /** Writing direction. @default 'ltr' */
  dir?: 'ltr' | 'rtl';
  /** When `true`, selecting a parent also selects all of its descendants (requires `multiple`). */
  propagateSelect?: boolean;
  /**
   * When `true`, selecting *all* children of a parent also selects the parent,
   * and deselecting any child unselects it — partial coverage surfaces as the
   * item's indeterminate state (requires `multiple`).
   */
  bubbleSelect?: boolean;
  /**
   * In `multiple` mode, controls how a click/Enter mutates the selection:
   * `'toggle'` (default) flips membership of the clicked item; `'replace'`
   * resets the selection to just that item and arms Shift+Arrow range select.
   * @default 'toggle'
   */
  selectionBehavior?: 'toggle' | 'replace';
}
</script>

<script setup lang="ts" generic="T">
import { computed, ref, toRef, watch } from 'vue';
import { resolveNextIndex, rovingKeyToAction } from '../../internal/utils/roving-focus';
import { collectDescendantKeys, flattenVisible, getNextMatch, keysBetween } from './utils';
import { useCollectionProvider } from '../../utilities/collection';
import { useConfig } from '../../utilities/config-provider';
import { refAutoReset, useForwardExpose } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { provideTreeContext } from './context';

// Hoisted roving-focus options — reused on every keydown to avoid per-event
// object allocation (keeps the IC at `rovingKeyToAction` monomorphic).
const ROVING_OPTS_LTR = { orientation: 'vertical', dir: 'ltr', loop: false } as const;
const ROVING_OPTS_RTL = { orientation: 'vertical', dir: 'rtl', loop: false } as const;

const {
  as = 'ul',
  items,
  getKey,
  getChildren = (item: T): readonly T[] | undefined | null => (item as { children?: readonly T[] | null } | undefined)?.children,
  getLabel,
  defaultValue,
  defaultExpanded,
  multiple = false,
  disabled = false,
  dir,
  propagateSelect = false,
  bubbleSelect = false,
  selectionBehavior = 'toggle',
} = defineProps<TreeRootProps<T>>();

const selectedModel = defineModel<string | string[] | undefined>();
const expandedModel = defineModel<string[]>('expanded');

const { forwardRef } = useForwardExpose();
const config = useConfig();

// Writing direction — local prop wins, else inherit from <ConfigProvider>.
const direction = computed(() => dir ?? config.dir.value);

function normalize(v: string | string[] | undefined): string[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

// --- Selection state ------------------------------------------------------

const localSelected = ref<string[]>(
  selectedModel.value !== undefined ? normalize(selectedModel.value) : normalize(defaultValue),
);

watch(selectedModel, (v) => {
  if (v === undefined) return;
  const arr = normalize(v);
  const cur = localSelected.value;
  if (arr.length === cur.length && arr.every((x, i) => x === cur[i])) return;
  localSelected.value = arr;
});

function commitSelected(next: string[]): void {
  localSelected.value = next;
  selectedModel.value = multiple ? next : next[0];
}

// O(1) membership lookup — replaces linear `.includes()` that was called once
// per TreeItem's `isSelected` computed, causing O(n²) work on selection change.
const selectedSet = computed(() => new Set(localSelected.value));

function isSelected(key: string): boolean {
  return selectedSet.value.has(key);
}

// Anchor key for Shift+Arrow contiguous range selection (`replace` mode only).
const anchorKey = ref<string | undefined>(localSelected.value[localSelected.value.length - 1]);

// Walk parent chain upward applying bubbleSelect: a parent becomes selected iff
// all its (transitive) children are selected. Mutates `set` in place.
function applyBubbleSelect(value: T, set: Set<string>): void {
  const byKey = flatByKey.value;
  let parentKey = byKey.get(getKey(value))?.parentKey;
  while (parentKey !== undefined) {
    const parent = byKey.get(parentKey);
    if (!parent) break;
    const descendants = collectDescendantKeys(parent.value, getKey, getChildren);
    const allSelected = descendants.length > 0 && descendants.every(k => set.has(k));
    if (allSelected) set.add(parentKey);
    else set.delete(parentKey);
    parentKey = parent.parentKey;
  }
}

function select(value: T): void {
  if (disabled) return;
  const key = getKey(value);
  const current = localSelected.value;

  if (multiple) {
    const alreadySelected = selectedSet.value.has(key);
    anchorKey.value = key;

    // `replace` behaviour — collapse selection to just this item (parity with
    // listbox's selectionBehavior). Shift+Arrow then extends from this anchor.
    if (selectionBehavior === 'replace') {
      commitSelected([key]);
      return;
    }

    if (propagateSelect) {
      // `key` + all descendant keys; cascade select/deselect as a unit.
      const cascadeKeys = collectDescendantKeys(value, getKey, getChildren);
      cascadeKeys.push(key);

      const merged = new Set(current);
      if (alreadySelected) {
        for (let i = 0; i < cascadeKeys.length; i++) merged.delete(cascadeKeys[i]!);
      }
      else {
        for (let i = 0; i < cascadeKeys.length; i++) merged.add(cascadeKeys[i]!);
      }
      if (bubbleSelect) applyBubbleSelect(value, merged);
      commitSelected([...merged]);
      return;
    }

    const merged = new Set(current);
    if (alreadySelected) merged.delete(key);
    else merged.add(key);
    if (bubbleSelect) applyBubbleSelect(value, merged);
    commitSelected([...merged]);
    return;
  }

  // single select — toggle off if already selected
  anchorKey.value = key;
  if (current[0] === key) commitSelected([]);
  else commitSelected([key]);
}

// --- Expanded state -------------------------------------------------------

const localExpanded = ref<string[]>(
  expandedModel.value !== undefined ? [...expandedModel.value] : [...(defaultExpanded ?? [])],
);

watch(expandedModel, (v) => {
  if (v === undefined) return;
  const cur = localExpanded.value;
  if (v.length === cur.length && v.every((x, i) => x === cur[i])) return;
  localExpanded.value = [...v];
});

const expandedSet = computed(() => new Set(localExpanded.value));

function isExpanded(key: string): boolean {
  return expandedSet.value.has(key);
}

function commitExpanded(next: string[]): void {
  localExpanded.value = next;
  expandedModel.value = next;
}

function toggleExpanded(value: T): void {
  const children = getChildren(value);
  if (!children || children.length === 0) return;
  const key = getKey(value);
  const current = localExpanded.value;
  if (expandedSet.value.has(key)) {
    const next: string[] = [];
    for (let i = 0; i < current.length; i++) {
      const k = current[i]!;
      if (k !== key) next.push(k);
    }
    commitExpanded(next);
  }
  else {
    commitExpanded([...current, key]);
  }
}

// --- Flattened visible items ---------------------------------------------

const flatItems = computed<Array<FlatItem<T>>>(() =>
  flattenVisible(items, getKey, getChildren, expandedSet.value),
);

// Full key→item map over the WHOLE tree (ignores expansion). Built lazily and
// only when bubble/indeterminate features are active, so plain trees pay
// nothing. `shallowRef`-style replacement — the Map is rebuilt wholesale on a
// structural change. Used to walk the parent chain past collapsed ancestors.
const flatByKey = computed<Map<string, { value: T; parentKey?: string }>>(() => {
  const map = new Map<string, { value: T; parentKey?: string }>();
  if (!bubbleSelect && !propagateSelect) return map;
  interface Frame { nodes: readonly T[]; parentKey?: string }
  const stack: Frame[] = [{ nodes: items, parentKey: undefined }];
  while (stack.length > 0) {
    const frame = stack.pop()!;
    for (let i = 0; i < frame.nodes.length; i++) {
      const node = frame.nodes[i]!;
      const key = getKey(node);
      map.set(key, { value: node, parentKey: frame.parentKey });
      const ch = getChildren(node);
      if (ch && ch.length > 0) stack.push({ nodes: ch, parentKey: key });
    }
  }
  return map;
});

// --- Indeterminate (tri-state) -------------------------------------------

function isIndeterminate(item: FlatItem<T>): boolean | undefined {
  if (!multiple || !item.hasChildren) return undefined;
  if (!bubbleSelect && !propagateSelect) return undefined;
  const descendants = collectDescendantKeys(item.value, getKey, getChildren);
  if (descendants.length === 0) return undefined;
  const set = selectedSet.value;
  let some = false;
  let all = true;
  for (let i = 0; i < descendants.length; i++) {
    if (set.has(descendants[i]!)) some = true;
    else all = false;
  }
  return some && !all ? true : undefined;
}

// --- Keyboard navigation --------------------------------------------------

const { getItems, CollectionSlot } = useCollectionProvider();
const treeItemElements = computed(() => getItems(true).map(i => i.ref));

// Roving tab stop — exactly one item carries `tabindex=0`. Seeds to the first
// selected key, else the first visible item, so Tab enters the tree once and
// arrow keys move within it (WAI-ARIA single-tabstop tree pattern).
const currentTabStopKey = ref<string | undefined>();
const effectiveTabStopKey = computed(() => {
  const cur = currentTabStopKey.value;
  const visible = flatItems.value;
  if (cur !== undefined && visible.some(i => i.key === cur)) return cur;
  const firstSelected = visible.find(i => selectedSet.value.has(i.key) && !(disabled));
  if (firstSelected) return firstSelected.key;
  return visible.length > 0 ? visible[0]!.key : undefined;
});

function setTabStop(key: string): void {
  currentTabStopKey.value = key;
}

function collectEnabled(): HTMLElement[] {
  const all = treeItemElements.value;
  const out: HTMLElement[] = [];
  for (let i = 0; i < all.length; i++) {
    const el = all[i]!;
    if (!el.hasAttribute('data-disabled')) out.push(el);
  }
  return out;
}

function focusElement(el: HTMLElement | undefined): void {
  if (!el) return;
  const key = el.getAttribute('data-key');
  if (key) currentTabStopKey.value = key;
  el.focus();
}

// Resolve the FlatItem behind a rendered element via its private `data-key`,
// decoupling Left/Right parent/child resolution from the public `aria-level`
// markup (which a consumer may override).
function itemOfElement(el: HTMLElement): FlatItem<T> | undefined {
  const key = el.getAttribute('data-key');
  if (key === null) return undefined;
  const visible = flatItems.value;
  for (let i = 0; i < visible.length; i++) {
    if (visible[i]!.key === key) return visible[i];
  }
  return undefined;
}

function levelOf(el: HTMLElement): number {
  return Number(el.getAttribute('data-level'));
}

// Buffered multi-character type-ahead, reset ~500ms after the last keystroke.
const typeaheadBuffer = refAutoReset('', 500);

function textOf(el: HTMLElement): string {
  const item = itemOfElement(el);
  if (item && getLabel) return getLabel(item.value);
  return el.dataset['textValue'] ?? el.textContent?.trim() ?? '';
}

function onTypeahead(key: string, el: HTMLElement): void {
  const enabled = collectEnabled();
  if (enabled.length === 0) return;
  typeaheadBuffer.value += key;
  const values = enabled.map(textOf);
  const current = textOf(el);
  const next = getNextMatch(values, typeaheadBuffer.value, current);
  if (next === undefined) return;
  focusElement(enabled[values.indexOf(next)]);
}

// Contiguous range selection (multiple + `replace`) on Shift+navigation.
function extendRange(targetEl: HTMLElement | undefined): void {
  if (!multiple || selectionBehavior !== 'replace') return;
  if (anchorKey.value === undefined || !targetEl) return;
  const targetKey = targetEl.getAttribute('data-key');
  if (!targetKey) return;
  const keys = collectEnabled().map(e => e.getAttribute('data-key') ?? '');
  const range = keysBetween(keys, anchorKey.value, targetKey);
  if (range.length === 0) return;
  commitSelected(range);
}

function onItemKeyDown(event: KeyboardEvent, el: HTMLElement, item: FlatItem<T>): void {
  // Enter / Space → select (tree-specific, not covered by roving-focus helper)
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    select(item.value);
    return;
  }

  const enabled = collectEnabled();
  if (enabled.length === 0) return;
  const idx = enabled.indexOf(el);

  // PageUp / PageDown jump to first / last visible item (APG tree pattern).
  if (event.key === 'PageUp' || event.key === 'Home') {
    event.preventDefault();
    const target = enabled[0]!;
    if (event.shiftKey) extendRange(target);
    focusElement(target);
    return;
  }
  if (event.key === 'PageDown' || event.key === 'End') {
    event.preventDefault();
    const target = enabled[enabled.length - 1]!;
    if (event.shiftKey) extendRange(target);
    focusElement(target);
    return;
  }

  // Up / Down → delegate to shared roving-focus helper.
  const action = rovingKeyToAction(
    event,
    direction.value === 'rtl' ? ROVING_OPTS_RTL : ROVING_OPTS_LTR,
  );
  if (action && action.absolute === undefined) {
    event.preventDefault();
    const nextIdx = resolveNextIndex(idx, action.delta, enabled.length, false);
    const target = enabled[nextIdx]!;
    if (event.shiftKey) extendRange(target);
    focusElement(target);
    return;
  }

  // Left / Right have tree-specific semantics beyond roving focus:
  //   forward  — expand collapsed parent, else move to first child
  //   back     — collapse expanded parent, else move to parent item
  const ltr = direction.value !== 'rtl';
  const forwardKey = ltr ? 'ArrowRight' : 'ArrowLeft';
  const backKey = ltr ? 'ArrowLeft' : 'ArrowRight';

  if (event.key === forwardKey) {
    event.preventDefault();
    if (!item.hasChildren) return;
    if (!isExpanded(item.key)) {
      toggleExpanded(item.value);
      return;
    }
    const next = enabled[idx + 1];
    if (next && levelOf(next) === item.level + 1) focusElement(next);
    return;
  }

  if (event.key === backKey) {
    event.preventDefault();
    if (item.hasChildren && isExpanded(item.key)) {
      toggleExpanded(item.value);
      return;
    }
    const parentLevel = item.level - 1;
    for (let i = idx - 1; i >= 0; i--) {
      const candidate = enabled[i]!;
      if (levelOf(candidate) === parentLevel) {
        focusElement(candidate);
        return;
      }
    }
    return;
  }

  // Printable single character → type-ahead (ignore modifier combos).
  if (
    event.key.length === 1
    && !event.ctrlKey
    && !event.altKey
    && !event.metaKey
    && event.key !== ' '
  ) {
    onTypeahead(event.key, el);
  }
}

provideTreeContext({
  flatItems,
  expandedKeys: localExpanded,
  selectedKeys: localSelected,
  multiple: toRef(() => multiple),
  disabled: toRef(() => disabled),
  direction,
  propagateSelect: toRef(() => propagateSelect),
  bubbleSelect: toRef(() => bubbleSelect),
  selectionBehavior: toRef(() => selectionBehavior),
  currentTabStopKey: effectiveTabStopKey,
  isExpanded,
  isSelected,
  isIndeterminate,
  toggleExpanded,
  select,
  setTabStop,
  treeItemElements,
  onItemKeyDown,
});

defineSlots<{
  default?: (props: {
    flatItems: Array<FlatItem<T>>;
    selectedKeys: string[];
    expandedKeys: string[];
  }) => unknown;
}>();
</script>

<template>
  <CollectionSlot>
    <Primitive
      :ref="forwardRef"
      :as="as"
      role="tree"
      :aria-multiselectable="multiple ? true : undefined"
      :aria-disabled="disabled || undefined"
      :dir="direction"
    >
      <slot
        :flat-items="flatItems"
        :selected-keys="localSelected"
        :expanded-keys="localExpanded"
      />
    </Primitive>
  </CollectionSlot>
</template>
