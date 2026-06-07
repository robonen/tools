import type { Ref, ShallowRef } from 'vue';
import type { ListboxValue } from './utils';
import { useContextFactory } from '@robonen/vue';

export type ListboxOrientation = 'vertical' | 'horizontal';
export type ListboxDirection = 'ltr' | 'rtl';
export type ListboxSelectionBehavior = 'toggle' | 'replace';

export interface ListboxRootContext<T extends ListboxValue = ListboxValue> {
  modelValue: Ref<T | T[] | undefined>;
  multiple: Ref<boolean>;
  orientation: Ref<ListboxOrientation>;
  direction: Ref<ListboxDirection>;
  disabled: Ref<boolean>;
  highlightOnHover: Ref<boolean>;
  selectionBehavior: Ref<ListboxSelectionBehavior>;
  highlightedElement: ShallowRef<HTMLElement | undefined>;
  focusable: Ref<boolean>;
  by?: string | ((a: T, b: T) => boolean);

  onValueChange: (value: T) => void;
  isSelected: (value: T) => boolean;
  changeHighlight: (el: HTMLElement | undefined, scrollIntoView?: boolean, focus?: boolean) => void;
  onKeydownNavigation: (event: KeyboardEvent) => void;
  onKeydownEnter: (event: KeyboardEvent) => void;
  onKeydownTypeAhead: (event: KeyboardEvent) => void;
  highlightFirstItem: () => void;
  onEnter: (event: Event) => void;
  onLeave: (event: Event) => void;
}

export interface ListboxItemContext {
  isSelected: Ref<boolean>;
}

export interface ListboxGroupContext {
  id: string;
}

export const {
  inject: useListboxRootContext,
  provide: provideListboxRootContext,
} = useContextFactory<ListboxRootContext<any>>('listbox');

export const {
  inject: useListboxItemContext,
  provide: provideListboxItemContext,
} = useContextFactory<ListboxItemContext>('listbox-item');

export const {
  inject: useListboxGroupContext,
  provide: provideListboxGroupContext,
} = useContextFactory<ListboxGroupContext>('listbox-group');
