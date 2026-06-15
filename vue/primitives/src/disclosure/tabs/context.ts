import type { ComputedRef, Ref, ShallowRef } from 'vue';
import { useContextFactory } from '@robonen/vue';

/**
 * A tab value. Strings are the common case; numbers are accepted as
 * first-class so numeric tab ids (e.g. `:value="0"`) work without coercion.
 */
export type TabsValue = string | number;

export interface TabsContext {
  value: Ref<TabsValue | undefined>;
  orientation: Ref<'horizontal' | 'vertical'>;
  direction: Ref<'ltr' | 'rtl'>;
  loop: Ref<boolean>;
  disabled: Ref<boolean>;
  activationMode: Ref<'automatic' | 'manual'>;
  /** When `true`, inactive panels are unmounted instead of kept hidden. */
  unmountOnHide: Ref<boolean>;
  /** Stable base id used to derive per-tab trigger/content ids. */
  baseId: Ref<string>;
  /** Live `TabsList` element, consumed by `TabsIndicator`. */
  tabsListElement: ShallowRef<HTMLElement | undefined>;
  /** Values of currently-mounted `TabsContent` panels (for `aria-controls`). */
  contentIds: ShallowRef<Set<TabsValue>>;
  /** DOM-ordered tab elements, sourced from the internal Collection. */
  tabElements: ComputedRef<HTMLElement[]>;
  /** Build the trigger element id for a tab value. */
  getTriggerId: (value: TabsValue) => string;
  /** Build the content/panel element id for a tab value. */
  getContentId: (value: TabsValue) => string;
  /** Register a mounted `TabsContent` so triggers can wire `aria-controls`. */
  registerContent: (value: TabsValue) => void;
  /** Unregister a `TabsContent` on unmount. */
  unregisterContent: (value: TabsValue) => void;
  select: (value: TabsValue) => void;
  onTriggerKeyDown: (event: KeyboardEvent, el: HTMLElement) => void;
}

export const {
  inject: useTabsContext,
  provide: provideTabsContext,
} = useContextFactory<TabsContext>('TabsContext');
