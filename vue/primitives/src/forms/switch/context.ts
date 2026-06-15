import type { ComputedRef } from 'vue';
import { useContextFactory } from '@robonen/vue';

/**
 * Context published by the switch root for descendant parts (e.g. the thumb).
 * Both fields are derived state, so parts can mirror them into `data-state` /
 * `data-disabled` without reaching back into the DOM.
 */
export interface SwitchContext {
  /** Whether the switch is currently in its "on" state. */
  checked: ComputedRef<boolean>;
  /** Whether interaction is disabled. */
  disabled: ComputedRef<boolean>;
}

const ctx = useContextFactory<SwitchContext>('switch');

export const provideSwitchContext = ctx.provide;
export const useSwitchContext = ctx.inject;
