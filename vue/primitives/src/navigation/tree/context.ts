import type { ComputedRef, Ref } from 'vue';
import type { FlatItem } from './utils';
import { useContextFactory } from '@robonen/vue';

export type TreeSelectionBehavior = 'toggle' | 'replace';

export interface TreeContext<T = unknown> {
  /** Reactive flattened visible items (only descendants of expanded nodes). */
  flatItems: ComputedRef<Array<FlatItem<T>>>;
  /** Current expanded keys. */
  expandedKeys: Ref<string[]>;
  /** Current selected keys. */
  selectedKeys: Ref<string[]>;
  /** Whether multiple selection is enabled. */
  multiple: Ref<boolean>;
  /** Whether the whole tree is disabled. */
  disabled: Ref<boolean>;
  /** Writing direction — affects Left/Right semantics. */
  direction: Ref<'ltr' | 'rtl'>;
  /** When `true`, selecting a parent cascades selection to all descendants. */
  propagateSelect: Ref<boolean>;
  /** When `true`, selecting all children of a parent selects the parent too. */
  bubbleSelect: Ref<boolean>;
  /** How a multi-selection mutates on select: toggle membership or replace. */
  selectionBehavior: Ref<TreeSelectionBehavior>;
  /** Key of the current roving tab stop — only one item carries `tabindex=0`. */
  currentTabStopKey: Ref<string | undefined>;

  isExpanded: (key: string) => boolean;
  isSelected: (key: string) => boolean;
  /**
   * Tri-state for a parent in `propagateSelect`/`bubbleSelect` mode: `true` when
   * some — but not all — descendants are selected. `undefined` otherwise.
   */
  isIndeterminate: (item: FlatItem<T>) => boolean | undefined;
  toggleExpanded: (value: T) => void;
  select: (value: T) => void;
  /** Mark this item as the current roving tab stop (e.g. on focus). */
  setTabStop: (key: string) => void;

  /** DOM-ordered list of rendered treeitem elements (from the internal Collection). */
  treeItemElements: ComputedRef<HTMLElement[]>;
  /** Keyboard handler wired from items to the root. */
  onItemKeyDown: (event: KeyboardEvent, el: HTMLElement, item: FlatItem<T>) => void;
}

export const {
  inject: useTreeContext,
  provide: provideTreeContext,
} = useContextFactory<TreeContext<unknown>>('TreeContext');
