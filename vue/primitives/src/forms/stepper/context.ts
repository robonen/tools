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
  /** `true` when the active step is the first step. */
  isFirstStep: ComputedRef<boolean>;
  /** `true` when the active step is the last registered step. */
  isLastStep: ComputedRef<boolean>;
  /** `true` when the next step's trigger is disabled (or there is no next step). */
  isNextDisabled: ComputedRef<boolean>;
  /** `true` when the previous step's trigger is disabled (or there is no previous step). */
  isPrevDisabled: ComputedRef<boolean>;

  /** Navigate to an absolute step (1-based), respecting `linear`/`disabled`. */
  goToStep: (step: number) => void;
  /** Navigate to the step after the active one. */
  goToNextStep: () => void;
  /** Navigate to the step before the active one. */
  goToPrevStep: () => void;
  /** `true` when there is a step after the active one. */
  hasNext: () => boolean;
  /** `true` when there is a step before the active one. */
  hasPrev: () => boolean;
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
