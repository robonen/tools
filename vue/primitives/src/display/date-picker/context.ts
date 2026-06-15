import type { ComputedRef, Ref } from 'vue';
import type { DateAdapter } from '../../utilities/config-provider';
import type { Granularity, HourCycle } from './use-date-field';
import { useContextFactory } from '@robonen/vue';

export interface DatePickerRootContext {
  /** Resolved date backend (root `dateAdapter` prop or the global `ConfigProvider`). */
  dateAdapter: ComputedRef<DateAdapter<Date>>;
  open: Ref<boolean>;
  modal: Ref<boolean>;
  name: Ref<string | undefined>;
  modelValue: Ref<Date | undefined>;
  placeholder: Ref<Date>;
  locale: Ref<string>;
  dir: Ref<'ltr' | 'rtl'>;
  disabled: Ref<boolean>;
  readonly: Ref<boolean>;
  required: Ref<boolean>;
  isInvalid: ComputedRef<boolean>;
  granularity: ComputedRef<Granularity>;
  hourCycle: Ref<HourCycle>;
  minValue: Ref<Date | undefined>;
  maxValue: Ref<Date | undefined>;
  triggerId: ComputedRef<string>;
  contentId: ComputedRef<string>;
  fieldId: ComputedRef<string>;
  triggerElement: Ref<HTMLElement | undefined>;
  hasCustomAnchor: Ref<boolean>;
  /** Commit a date from any source (calendar cell or field), honoring readonly/granularity/preventDeselect. */
  onDateChange: (date: Date | undefined) => void;
  onPlaceholderChange: (date: Date) => void;
  onOpenChange: (value: boolean) => void;
  onOpenToggle: () => void;
}

const ctx = useContextFactory<DatePickerRootContext>('DatePickerRoot');
export const provideDatePickerRootContext = ctx.provide;
export const useDatePickerRootContext = ctx.inject;
