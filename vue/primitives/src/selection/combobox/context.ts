import type { ComputedRef, Ref, ShallowRef } from 'vue';
import type { Direction } from '../../utilities/config-provider';
import type { AcceptableValue, ComboboxFilterFunction } from './utils';

import { useContextFactory } from '@robonen/vue';

export interface ComboboxItemInfo<T = AcceptableValue> {
  value: T;
  textValue: string;
  disabled: boolean;
  /**
   * Runs the item's cancelable `select` flow (fires the `select` event, commits
   * unless prevented). Lets keyboard Enter on the Input go through the same
   * interception point as a click. Returns whether selection committed.
   */
  select: (originalEvent: KeyboardEvent | PointerEvent | MouseEvent) => boolean;
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
  resetModelValueOnClear: Ref<boolean>;
  openOnFocus: Ref<boolean>;
  openOnClick: Ref<boolean>;
  highlightOnHover: Ref<boolean>;
  ignoreFilter: Ref<boolean>;
  filterFunction: Ref<ComboboxFilterFunction | undefined>;
  displayValue?: (value: T | T[] | undefined) => string;
  /** Clears the current selection (resets the model). */
  clearModelValue: () => void;

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
  /**
   * The id of the rendered `ComboboxLabel`, or `undefined` until one mounts.
   * The group only points `aria-labelledby` at it once it exists, avoiding a
   * dangling reference when no label is rendered.
   */
  labelId: Ref<string | undefined>;
  registerLabel: (id: string) => void;
  unregisterLabel: () => void;
}

export interface ComboboxItemContext<T = AcceptableValue> {
  id: Ref<string>;
  value: T;
  textValue: Ref<string>;
  isSelected: Ref<boolean>;
  isDisabled: Ref<boolean>;
}

// `any` (not `AcceptableValue`): the generic `ComboboxRoot` provides a
// `ComboboxRootContext<T>` whose contravariant callbacks ((value: T) => void)
// are not assignable to the concrete `AcceptableValue` instantiation. `any` is
// the type-erasure boundary that lets the generic root provide and arbitrary
// `ComboboxItem<T>` consumers inject without per-component casts.
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

// `any` for the same generic type-erasure reason as the root context above:
// `ComboboxItem<T>` provides `ComboboxItemContext<T>`, injected generically.
export const {
  inject: useComboboxItemContext,
  provide: provideComboboxItemContext,
} = useContextFactory<ComboboxItemContext<any>>('ComboboxItem');
