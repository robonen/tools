import type { Ref, ShallowRef } from 'vue';
import type { Direction } from '../config-provider';

import { useContextFactory } from '@robonen/vue';

export type SelectValue = string;

export interface SelectRootContext {
  value: Ref<SelectValue | undefined>;
  onValueChange: (value: SelectValue) => void;
  open: Ref<boolean>;
  onOpenChange: (open: boolean) => void;
  dir: Ref<Direction | undefined>;
  disabled: Ref<boolean>;
  required: Ref<boolean>;
  name: Ref<string | undefined>;
  triggerElement: ShallowRef<HTMLElement | undefined>;
  onTriggerChange: (el: HTMLElement | undefined) => void;
  contentId: Ref<string>;
  displayValue: Ref<string | undefined>;
  optionsSet: ShallowRef<Map<SelectValue, string>>;
  onOptionAdd: (value: SelectValue, textContent: string) => void;
  onOptionRemove: (value: SelectValue) => void;
  itemRefCallback: (el: HTMLElement | undefined, value: SelectValue, disabled: boolean) => void;
  itemTextRefCallback: (el: HTMLElement | undefined, value: SelectValue) => void;
  selectedItemRef: ShallowRef<HTMLElement | undefined>;
  selectedItemTextRef: ShallowRef<HTMLElement | undefined>;
}

export interface SelectContentContext {
  viewportRef: ShallowRef<HTMLElement | undefined>;
  onViewportChange: (el: HTMLElement | undefined) => void;
  selectedItemRef: ShallowRef<HTMLElement | undefined>;
  selectedItemTextRef: ShallowRef<HTMLElement | undefined>;
  onItemLeave: () => void;
  itemRefCallback: SelectRootContext['itemRefCallback'];
  itemTextRefCallback: SelectRootContext['itemTextRefCallback'];
  isPositioned: Ref<boolean>;
  searchRef: Ref<string>;
  position: 'item-aligned' | 'popper';
}

export interface SelectGroupContext {
  id: Ref<string>;
}

export interface SelectItemContext {
  value: SelectValue;
  isSelected: Ref<boolean>;
  isDisabled: Ref<boolean>;
  textId: Ref<string>;
  onItemTextChange: (el: HTMLElement | undefined) => void;
}

const {
  inject: useSelectRootContext,
  provide: provideSelectRootContext,
} = useContextFactory<SelectRootContext>('SelectRootContext');

const {
  inject: useSelectContentContext,
  provide: provideSelectContentContext,
} = useContextFactory<SelectContentContext>('SelectContentContext');

const {
  inject: useSelectGroupContext,
  provide: provideSelectGroupContext,
} = useContextFactory<SelectGroupContext>('SelectGroupContext');

const {
  inject: useSelectItemContext,
  provide: provideSelectItemContext,
} = useContextFactory<SelectItemContext>('SelectItemContext');

export {
  useSelectRootContext,
  provideSelectRootContext,
  useSelectContentContext,
  provideSelectContentContext,
  useSelectGroupContext,
  provideSelectGroupContext,
  useSelectItemContext,
  provideSelectItemContext,
};
