import type { ComputedRef, Ref, ShallowRef } from 'vue';
import type { Direction } from '../config-provider';
import type { AcceptableValue, ComboboxFilterFunction } from './utils';

import { useContextFactory } from '@robonen/vue';

export interface ComboboxItemInfo<T = AcceptableValue> {
  value: T;
  textValue: string;
  disabled: boolean;
}

export interface ComboboxFilterState {
  count: number;
  items: Set<string>;
  groups: Set<string>;
}

export interface ComboboxRootContext<T = AcceptableValue> {
  modelValue: Ref<T | T[] | undefined>;
  onValueChange: (value: T) => void;
  multiple: Ref<boolean>;
  open: Ref<boolean>;
  onOpenChange: (open: boolean) => void;
  disabled: Ref<boolean>;
  dir: Ref<Direction>;
  name: Ref<string | undefined>;
  required: Ref<boolean>;
  by?: string | ((a: T, b: T) => boolean);
  isSelected: (value: T) => boolean;

  searchTerm: Ref<string>;
  onSearchTermChange: (value: string) => void;
  resetSearchTermOnBlur: Ref<boolean>;
  resetSearchTermOnSelect: Ref<boolean>;
  ignoreFilter: Ref<boolean>;
  filterFunction: Ref<ComboboxFilterFunction | undefined>;
  displayValue?: (value: T | T[] | undefined) => string;

  isUserInputted: Ref<boolean>;
  onUserInputtedChange: (value: boolean) => void;

  contentId: Ref<string>;
  triggerElement: ShallowRef<HTMLElement | undefined>;
  onTriggerChange: (el: HTMLElement | undefined) => void;
  inputElement: ShallowRef<HTMLInputElement | undefined>;
  onInputChange: (el: HTMLInputElement | undefined) => void;
  contentElement: ShallowRef<HTMLElement | undefined>;
  onContentChange: (el: HTMLElement | undefined) => void;
  parentElement: ShallowRef<HTMLElement | undefined>;
  onParentChange: (el: HTMLElement | undefined) => void;

  selectedValue: ShallowRef<T | undefined>;
  selectedValueId: Ref<string | undefined>;
  onSelectedValueChange: (value: T | undefined, id?: string) => void;

  allItems: ShallowRef<Map<string, ComboboxItemInfo<T>>>;
  onItemRegister: (id: string, info: ComboboxItemInfo<T>) => void;
  onItemUnregister: (id: string) => void;
  allGroups: ShallowRef<Map<string, Set<string>>>;
  onGroupRegister: (groupId: string) => void;
  onGroupUnregister: (groupId: string) => void;
  onGroupItemRegister: (groupId: string, itemId: string) => void;
  onGroupItemUnregister: (groupId: string, itemId: string) => void;

  filterState: ComputedRef<ComboboxFilterState>;

  /** Returns visible, enabled item elements in DOM order. */
  getVisibleItemElements: () => HTMLElement[];
  /** Highlights an item element by its id. */
  highlightItemById: (id: string | undefined) => void;
  /** Highlights the first visible item. */
  highlightFirstItem: () => void;
}

export interface ComboboxContentContext {
  viewportElement: ShallowRef<HTMLElement | undefined>;
  onViewportChange: (el: HTMLElement | undefined) => void;
  position: Ref<'inline' | 'popper'>;
}

export interface ComboboxGroupContext {
  id: Ref<string>;
}

export interface ComboboxItemContext<T = AcceptableValue> {
  id: Ref<string>;
  value: T;
  textValue: Ref<string>;
  isSelected: Ref<boolean>;
  isDisabled: Ref<boolean>;
}

export const {
  inject: useComboboxRootContext,
  provide: provideComboboxRootContext,
} = useContextFactory<ComboboxRootContext<any>>('ComboboxRoot');

export const {
  inject: useComboboxContentContext,
  provide: provideComboboxContentContext,
} = useContextFactory<ComboboxContentContext>('ComboboxContent');

export const {
  inject: useComboboxGroupContext,
  provide: provideComboboxGroupContext,
} = useContextFactory<ComboboxGroupContext>('ComboboxGroup');

export const {
  inject: useComboboxItemContext,
  provide: provideComboboxItemContext,
} = useContextFactory<ComboboxItemContext<any>>('ComboboxItem');
