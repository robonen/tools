import type { ComputedRef, Ref } from 'vue';
import { useContextFactory } from '@robonen/vue';

export interface DatePickerRootContext {
  open: Ref<boolean>;
  modal: Ref<boolean>;
  name: Ref<string | undefined>;
  modelValue: Ref<Date | undefined>;
  locale: Ref<string>;
  triggerId: ComputedRef<string>;
  contentId: ComputedRef<string>;
  triggerElement: Ref<HTMLElement | undefined>;
  hasCustomAnchor: Ref<boolean>;
  onOpenChange: (value: boolean) => void;
  onOpenToggle: () => void;
}

const ctx = useContextFactory<DatePickerRootContext>('DatePickerRoot');
export const provideDatePickerRootContext = ctx.provide;
export const useDatePickerRootContext = ctx.inject;
