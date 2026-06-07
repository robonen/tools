import type { ComputedRef, Ref } from 'vue';
import type { FlatItem } from './utils';
import { useContextFactory } from '@robonen/vue';

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

  isExpanded: (key: string) => boolean;
  isSelected: (key: string) => boolean;
  toggleExpanded: (value: T) => void;
  select: (value: T) => void;

  /** DOM-ordered list of rendered treeitem elements (from the internal Collection). */
  treeItemElements: ComputedRef<HTMLElement[]>;
  /** Keyboard handler wired from items to the root. */
  onItemKeyDown: (event: KeyboardEvent, el: HTMLElement, item: FlatItem<T>) => void;
}

export const {
  inject: useTreeContext,
  provide: provideTreeContext,
} = useContextFactory<TreeContext<any>>('TreeContext');
