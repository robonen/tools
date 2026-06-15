import type { ComputedRef, Ref, ShallowRef } from 'vue';
import type { CommandFilterFunction } from './utils';

import { useContextFactory } from '@robonen/vue';

export interface CommandItemInfo {
  value: string;
  /** Display/searchable text. Filtering targets this instead of the identity `value`. */
  textValue: string;
  keywords: string[];
  disabled: boolean;
  onSelect?: () => void;
}

export interface CommandContext {
  /** Committed selected value (v-model). */
  modelValue: Ref<string | undefined>;
  setModelValue: (value: string | undefined) => void;

  /** Current search term (v-model:searchTerm). */
  searchTerm: Ref<string>;
  setSearchTerm: (value: string) => void;

  /** Currently highlighted item value (keyboard / pointer focus). */
  selectedValue: Ref<string | undefined>;
  setSelectedValue: (value: string | undefined) => void;

  /** Behavior flags. */
  shouldFilter: Ref<boolean>;
  loop: Ref<boolean>;
  filterFunction: Ref<CommandFilterFunction | undefined>;
  /** Effective reading direction (per-root override or `ConfigProvider`). */
  dir: Ref<'ltr' | 'rtl'>;

  /** A11y identifiers. */
  listId: Ref<string>;
  labelId: Ref<string>;
  getItemId: (value: string) => string;

  /** Registries. */
  allItems: ShallowRef<Map<string, CommandItemInfo>>;
  filteredItems: ComputedRef<Map<string, number>>;
  registerItem: (info: CommandItemInfo) => void;
  unregisterItem: (value: string) => void;

  allGroups: ShallowRef<Map<string, Set<string>>>;
  registerGroup: (groupId: string) => void;
  unregisterGroup: (groupId: string) => void;
  registerGroupItem: (groupId: string, value: string) => void;
  unregisterGroupItem: (groupId: string, value: string) => void;

  /** DOM. */
  listElement: ShallowRef<HTMLElement | undefined>;
  setListElement: (el: HTMLElement | undefined) => void;

  /** Returns selectable item values sorted by score desc, then DOM order. */
  getSelectableItems: () => string[];
  /** Commits the currently-highlighted item: updates modelValue + fires its select callback. */
  commitSelected: () => void;
  /** Clears the search term and, when `resetValue`, the committed selection too. */
  clear: (resetValue?: boolean) => void;
  /** Registered input element (so a clear/cancel affordance can refocus it). */
  inputElement: ShallowRef<HTMLElement | undefined>;
  setInputElement: (el: HTMLElement | undefined) => void;
}

export interface CommandGroupContext {
  id: Ref<string>;
  forceMount: Ref<boolean>;
}

export interface CommandItemContext {
  /** Whether this item matches the committed `modelValue`. */
  isSelected: Ref<boolean>;
}

export const {
  inject: useCommandContext,
  provide: provideCommandContext,
} = useContextFactory<CommandContext>('Command');

export const {
  inject: useCommandGroupContext,
  provide: provideCommandGroupContext,
} = useContextFactory<CommandGroupContext>('CommandGroup');

export const {
  inject: useCommandItemContext,
  provide: provideCommandItemContext,
} = useContextFactory<CommandItemContext>('CommandItem');
