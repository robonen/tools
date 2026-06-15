import type { ComputedRef, Ref } from 'vue';
import { useContextFactory } from '@robonen/vue';

export type ProgressState = 'indeterminate' | 'loading' | 'complete';

export interface ProgressContext {
  /** Resolved (validated/clamped) value; `null` when indeterminate. */
  value: Ref<number | null>;
  /** Resolved (validated) maximum. */
  max: Ref<number>;
  /** Derived progress state. */
  state: Ref<ProgressState>;
  /** Completion ratio in `[0, 1]`, or `null` when indeterminate. */
  progress: ComputedRef<number | null>;
  /** Completion percentage in `[0, 100]`, or `null` when indeterminate. */
  percentage: ComputedRef<number | null>;
}

const ctx = useContextFactory<ProgressContext>('ProgressContext');

export const provideProgressContext = ctx.provide;
export const useProgressContext = ctx.inject;
