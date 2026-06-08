import type { ComputedRef, Ref } from 'vue';
import { useContextFactory } from '@robonen/vue';

export type StepperOrientation = 'horizontal' | 'vertical';
export type StepperDirection = 'ltr' | 'rtl';
export type StepperState = 'completed' | 'active' | 'inactive';

export interface StepperRootContext {
  /** Currently active step (1-based). */
  value: Ref<number>;
  /** Total registered items, tracked through the Collection. */
  total: ComputedRef<number>;
  /** Orientation of the stepper — drives arrow-key axis. */
  orientation: Ref<StepperOrientation>;
  /** Writing direction. */
  direction: Ref<StepperDirection>;
  /** When `true`, steps must be completed in order. */
  linear: Ref<boolean>;
  /** Whether the whole stepper is disabled. */
  disabled: Ref<boolean>;

  goToStep: (step: number) => void;
  onTriggerKeyDown: (event: KeyboardEvent, el: HTMLElement) => void;
}

export interface StepperItemContext {
  step: Ref<number>;
  state: Ref<StepperState>;
  disabled: Ref<boolean>;
  focusable: Ref<boolean>;
  titleId: string;
  descriptionId: string;
}

export const {
  inject: useStepperRootContext,
  provide: provideStepperRootContext,
} = useContextFactory<StepperRootContext>('stepper');

export const {
  inject: useStepperItemContext,
  provide: provideStepperItemContext,
} = useContextFactory<StepperItemContext>('stepper-item');
