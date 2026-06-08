import type { Ref } from 'vue';
import { useContextFactory } from '@robonen/vue';

export type ProgressState = 'indeterminate' | 'loading' | 'complete';

export interface ProgressContext {
  value: Ref<number | null>;
  max: Ref<number>;
  state: Ref<ProgressState>;
}

const ctx = useContextFactory<ProgressContext>('ProgressContext');

export const provideProgressContext = ctx.provide;
export const useProgressContext = ctx.inject;
