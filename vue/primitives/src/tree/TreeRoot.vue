<script lang="ts" generic="T">
import type { FlatItem } from './utils';
import type { PrimitiveProps } from '../primitive';

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
}
</script>

<script setup lang="ts" generic="T">
import { computed, ref, toRef, watch } from 'vue';
import { resolveNextIndex, rovingKeyToAction } from '../utils/roving-focus';
import { flattenVisible } from './utils';
import { useCollectionProvider } from '../collection';
import { useConfig } from '../config-provider';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../primitive';
import { provideTreeContext } from './context';

// Hoisted roving-focus options — reused on every keydown to avoid per-event
// object allocation (keeps the IC at `rovingKeyToAction` monomorphic).
const ROVING_OPTS_LTR = { orientation: 'vertical', dir: 'ltr', loop: false } as const;
const ROVING_OPTS_RTL = { orientation: 'vertical', dir: 'rtl', loop: false } as const;

const {
  as = 'ul',
  items,
  getKey,
  getChildren = ((item: any) => item?.children) as (item: T) => readonly T[] | undefined | null,
  defaultValue,
  defaultExpanded,
  multiple = false,
  disabled = false,
  dir,
  propagateSelect = false,
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

function select(value: T): void {
  if (disabled) return;
  const key = getKey(value);
  const current = localSelected.value;

  if (multiple) {
    const alreadySelected = selectedSet.value.has(key);

    if (propagateSelect) {
      // Collect `key` + all descendant keys iteratively (avoids flattenAll's
      // intermediate {key,value}[] allocation — we only need the keys here).
      const cascadeKeys = new Set<string>();
      cascadeKeys.add(key);
      const stack: Array<readonly T[]> = [];
      const firstChildren = getChildren(value);
      if (firstChildren && firstChildren.length > 0) stack.push(firstChildren);
      while (stack.length > 0) {
        const nodes = stack.pop()!;
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i]!;
          cascadeKeys.add(getKey(node));
          const ch = getChildren(node);
          if (ch && ch.length > 0) stack.push(ch);
        }
      }

      if (alreadySelected) {
        // O(n) filter with Set lookup (was O(n*m) via Array.includes).
        const next: string[] = [];
        for (let i = 0; i < current.length; i++) {
          const k = current[i]!;
          if (!cascadeKeys.has(k)) next.push(k);
        }
        commitSelected(next);
      }
      else {
        const merged = new Set(current);
        cascadeKeys.forEach(k => merged.add(k));
        commitSelected([...merged]);
      }
      return;
    }

    if (alreadySelected) {
      const next: string[] = [];
      for (let i = 0; i < current.length; i++) {
        const k = current[i]!;
        if (k !== key) next.push(k);
      }
      commitSelected(next);
    }
    else {
      commitSelected([...current, key]);
    }
    return;
  }

  // single select — toggle off if already selected
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

// --- Keyboard navigation --------------------------------------------------

const { getItems, CollectionSlot } = useCollectionProvider();
const treeItemElements = computed(() => getItems(true).map(i => i.ref));

function collectEnabled(): HTMLElement[] {
  const all = treeItemElements.value;
  const out: HTMLElement[] = [];
  for (let i = 0; i < all.length; i++) {
    const el = all[i]!;
    if (!el.hasAttribute('data-disabled')) out.push(el);
  }
  return out;
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

  // Up / Down / Home / End → delegate to shared roving-focus helper.
  const action = rovingKeyToAction(
    event,
    direction.value === 'rtl' ? ROVING_OPTS_RTL : ROVING_OPTS_LTR,
  );
  if (action) {
    event.preventDefault();
    if (action.absolute === 'home') {
      enabled[0]!.focus();
      return;
    }
    if (action.absolute === 'end') {
      enabled[enabled.length - 1]!.focus();
      return;
    }
    const nextIdx = resolveNextIndex(idx, action.delta, enabled.length, false);
    enabled[nextIdx]!.focus();
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
    if (next && Number(next.getAttribute('aria-level')) === item.level + 1) next.focus();
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
      if (Number(candidate.getAttribute('aria-level')) === parentLevel) {
        candidate.focus();
        return;
      }
    }
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
  isExpanded,
  isSelected,
  toggleExpanded,
  select,
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
