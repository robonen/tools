import type { Ref } from 'vue';
import { useContextFactory } from '@robonen/vue';

export type CheckedState = boolean | 'indeterminate';

export interface CheckboxContext {
  checked: Ref<CheckedState>;
  disabled: Ref<boolean>;
}

const ctx = useContextFactory<CheckboxContext>('CheckboxContext');

export const provideCheckboxContext = ctx.provide;
export const useCheckboxContext = ctx.inject;
