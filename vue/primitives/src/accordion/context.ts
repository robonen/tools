import type { ComputedRef, Ref } from 'vue';
import { useContextFactory } from '@robonen/vue';

export interface AccordionContext {
  disabled: Ref<boolean>;
  orientation: Ref<'horizontal' | 'vertical'>;
  direction: Ref<'ltr' | 'rtl'>;
  loop: Ref<boolean>;
  collapsible: Ref<boolean>;
  /** DOM-ordered trigger elements, sourced from the internal Collection. */
  triggerElements: ComputedRef<HTMLElement[]>;
  isOpen: (value: string) => boolean;
  toggle: (value: string) => void;
  onTriggerKeyDown: (event: KeyboardEvent, el: HTMLElement) => void;
}

export const {
  inject: useAccordionContext,
  provide: provideAccordionContext,
} = useContextFactory<AccordionContext>('AccordionContext');

export interface AccordionItemContext {
  value: string;
  open: ComputedRef<boolean>;
  disabled: ComputedRef<boolean>;
  triggerId: ComputedRef<string>;
  contentId: ComputedRef<string>;
}

export const {
  inject: useAccordionItemContext,
  provide: provideAccordionItemContext,
} = useContextFactory<AccordionItemContext>('AccordionItemContext');
