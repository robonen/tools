import type { ComputedRef, Ref } from 'vue';
import { useContextFactory } from '@robonen/vue';

export interface TabsContext {
  value: Ref<string | undefined>;
  orientation: Ref<'horizontal' | 'vertical'>;
  direction: Ref<'ltr' | 'rtl'>;
  loop: Ref<boolean>;
  disabled: Ref<boolean>;
  activationMode: Ref<'automatic' | 'manual'>;
  /** DOM-ordered tab elements, sourced from the internal Collection. */
  tabElements: ComputedRef<HTMLElement[]>;
  select: (value: string) => void;
  onTriggerKeyDown: (event: KeyboardEvent, el: HTMLElement) => void;
}

export const {
  inject: useTabsContext,
  provide: provideTabsContext,
} = useContextFactory<TabsContext>('TabsContext');
