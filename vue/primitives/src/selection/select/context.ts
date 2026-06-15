import type { ComputedRef, Ref, ShallowRef } from 'vue';
import type { Direction } from '../../utilities/config-provider';
import type { AcceptableValue } from './utils';

import { useContextFactory } from '@robonen/vue';

/**
 * @deprecated Kept for backward compatibility. The select now accepts any
 * {@link AcceptableValue} (string/number/boolean/object). `SelectValue` remains
 * a string alias so existing `string`-typed consumers keep compiling.
 */
export type SelectValue = string;

export interface SelectOption {
  value: AcceptableValue;
  disabled?: boolean;
  textContent: string;
}

export interface SelectRootContext {
  value: Ref<AcceptableValue | AcceptableValue[] | undefined>;
  onValueChange: (value: AcceptableValue) => void;
  open: Ref<boolean>;
  onOpenChange: (open: boolean) => void;
  dir: Ref<Direction | undefined>;
  disabled: Ref<boolean>;
  required: Ref<boolean>;
  multiple: Ref<boolean>;
  by?: string | ((a: AcceptableValue, b: AcceptableValue) => boolean);
  name: Ref<string | undefined>;
  triggerElement: ShallowRef<HTMLElement | undefined>;
  onTriggerChange: (el: HTMLElement | undefined) => void;
  valueElement: ShallowRef<HTMLElement | undefined>;
  onValueElementChange: (el: HTMLElement | undefined) => void;
  triggerPointerDownPosRef: Ref<{ x: number; y: number } | null>;
  contentId: Ref<string>;
  isEmptyModelValue: ComputedRef<boolean>;
  /**
   * @deprecated Superseded by `optionsSet`. The persisted single-value label
   * still drives the legacy `displayValue` slot path.
   */
  displayValue: Ref<string | undefined>;
  optionsSet: ShallowRef<Set<SelectOption>>;
  onOptionAdd: (option: SelectOption) => void;
  onOptionRemove: (option: SelectOption) => void;
  itemRefCallback: (el: HTMLElement | undefined, value: AcceptableValue, disabled: boolean) => void;
  itemTextRefCallback: (el: HTMLElement | undefined, value: AcceptableValue) => void;
  selectedItemRef: ShallowRef<HTMLElement | undefined>;
  selectedItemTextRef: ShallowRef<HTMLElement | undefined>;
}

export interface SelectContentContext {
  viewportRef: ShallowRef<HTMLElement | undefined>;
  onViewportChange: (el: HTMLElement | undefined) => void;
  contentRef: ShallowRef<HTMLElement | undefined>;
  selectedItemRef: ShallowRef<HTMLElement | undefined>;
  selectedItemTextRef: ShallowRef<HTMLElement | undefined>;
  onItemLeave: () => void;
  focusSelectedItem: () => void;
  itemRefCallback: SelectRootContext['itemRefCallback'];
  itemTextRefCallback: SelectRootContext['itemTextRefCallback'];
  isPositioned: Ref<boolean>;
  searchRef: Ref<string>;
  position: 'item-aligned' | 'popper';
}

export interface SelectItemAlignedPositionContext {
  contentWrapper: ShallowRef<HTMLElement | undefined>;
  shouldExpandOnScrollRef: Ref<boolean>;
  onScrollButtonChange: (el: HTMLElement | undefined) => void;
}

export interface SelectGroupContext {
  id: Ref<string>;
}

export interface SelectItemContext {
  value: AcceptableValue;
  isSelected: Ref<boolean>;
  isDisabled: Ref<boolean>;
  isFocused: Ref<boolean>;
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
  inject: useSelectItemAlignedPositionContext,
  provide: provideSelectItemAlignedPositionContext,
} = useContextFactory<SelectItemAlignedPositionContext>('SelectItemAlignedPositionContext');

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
  useSelectItemAlignedPositionContext,
  provideSelectItemAlignedPositionContext,
  useSelectGroupContext,
  provideSelectGroupContext,
  useSelectItemContext,
  provideSelectItemContext,
};
