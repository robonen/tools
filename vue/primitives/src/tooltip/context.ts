import type { ComputedRef, Ref } from 'vue';
import type { TooltipState } from './utils';
import { useContextFactory } from '@robonen/vue';

export interface TooltipProviderContext {
  /** Whether the next tooltip open should wait for the full `delayDuration`. */
  isOpenDelayed: Ref<boolean>;
  /** Hover delay before opening when `isOpenDelayed` is `true`. */
  delayDuration: Ref<number>;
  /** Skip-delay window after a tooltip closes — used for "menu-like" hover groups. */
  skipDelayDuration: Ref<number>;
  /** Set to `true` while the pointer is in the safe-area between trigger and content. */
  isPointerInTransitRef: Ref<boolean>;
  /** Globally disable hoverable content (pointer leaving trigger immediately closes). */
  disableHoverableContent: Ref<boolean>;
  /** Globally disable closing the tooltip by clicking the trigger. */
  disableClosingTrigger: Ref<boolean>;
  /** Globally disable all tooltips inside this provider. */
  disabled: Ref<boolean>;
  /** Skip opening on non-keyboard focus (avoids tooltips after closing dialogs / switching tabs). */
  ignoreNonKeyboardFocus: Ref<boolean>;
  onOpen: () => void;
  onClose: () => void;
}

export const {
  inject: useTooltipProviderContext,
  provide: provideTooltipProviderContext,
} = useContextFactory<TooltipProviderContext>('TooltipProviderContext');

export interface TooltipContext {
  contentId: ComputedRef<string>;
  open: Ref<boolean>;
  stateAttribute: ComputedRef<TooltipState>;
  trigger: Ref<HTMLElement | undefined>;
  disableHoverableContent: ComputedRef<boolean>;
  disableClosingTrigger: ComputedRef<boolean>;
  disabled: ComputedRef<boolean>;
  ignoreNonKeyboardFocus: ComputedRef<boolean>;
  onTriggerChange: (el: HTMLElement | undefined) => void;
  onTriggerEnter: () => void;
  onTriggerLeave: () => void;
  onOpen: () => void;
  onClose: () => void;
}

export const {
  inject: useTooltipContext,
  provide: provideTooltipContext,
} = useContextFactory<TooltipContext>('TooltipContext');
