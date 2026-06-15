import type { Ref } from 'vue';
import { useContextFactory } from '@robonen/vue';

export interface AlertDialogContentContext {
  /**
   * DOM node of the Cancel control for this specific Content instance. Used to
   * move focus to the safe default choice on open — scoped per-instance so
   * nested or simultaneously-mounted alert dialogs focus their own Cancel and
   * never reach across to another dialog's button.
   */
  cancelElement: Ref<HTMLElement | undefined>;
}

const ctx = useContextFactory<AlertDialogContentContext>('AlertDialogContent');

export const provideAlertDialogContentContext = ctx.provide;
export const useAlertDialogContentContext = ctx.inject;
