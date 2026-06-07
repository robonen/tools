import { computed, ref } from 'vue';
import type { ComputedRef, MaybeRef, Ref } from 'vue';
import { isArray } from '@robonen/stdlib';

export interface UseStepperReturn<StepName, Steps, Step> {
  /** List of steps. */
  steps: Readonly<Ref<Steps>>;
  /** List of step names. */
  stepNames: Readonly<Ref<StepName[]>>;
  /** Index of the current step. */
  index: Ref<number>;
  /** Current step. */
  current: ComputedRef<Step>;
  /** Next step name, or undefined if the current step is the last one. */
  next: ComputedRef<StepName | undefined>;
  /** Previous step name, or undefined if the current step is the first one. */
  previous: ComputedRef<StepName | undefined>;
  /** Whether the current step is the first one. */
  isFirst: ComputedRef<boolean>;
  /** Whether the current step is the last one. */
  isLast: ComputedRef<boolean>;
  /** Get the step at the specified index. */
  at: (index: number) => Step | undefined;
  /** Get a step by the specified name. */
  get: (step: StepName) => Step | undefined;
  /** Go to the specified step. */
  goTo: (step: StepName) => void;
  /** Go to the next step. Does nothing if the current step is the last one. */
  goToNext: () => void;
  /** Go to the previous step. Does nothing if the current step is the first one. */
  goToPrevious: () => void;
  /** Go back to the given step, only if the current step is after it. */
  goBackTo: (step: StepName) => void;
  /** Checks whether the given step is the next step. */
  isNext: (step: StepName) => boolean;
  /** Checks whether the given step is the previous step. */
  isPrevious: (step: StepName) => boolean;
  /** Checks whether the given step is the current step. */
  isCurrent: (step: StepName) => boolean;
  /** Checks if the current step is before the given step. */
  isBefore: (step: StepName) => boolean;
  /** Checks if the current step is after the given step. */
  isAfter: (step: StepName) => boolean;
}

/**
 * @name useStepper
 * @category State
 * @description A composable for building wizards/steppers over a list or record of steps
 *
 * @param {MaybeRef<T[] | Record<string, any>>} steps The list of steps, or a record keyed by step name
 * @param {T} [initialStep] The step to start on (defaults to the first step)
 * @returns {UseStepperReturn} The stepper state and navigation helpers
 *
 * @example
 * const { current, goToNext, isLast } = useStepper(['first', 'second', 'last']);
 *
 * @example
 * const { current, stepNames, goTo } = useStepper({
 *   account: { title: 'Account' },
 *   billing: { title: 'Billing' },
 * });
 *
 * @since 0.0.15
 */
export function useStepper<T extends string | number>(
  steps: MaybeRef<T[]>,
  initialStep?: T,
): UseStepperReturn<T, T[], T>;
export function useStepper<T extends Record<string, any>>(
  steps: MaybeRef<T>,
  initialStep?: keyof T,
): UseStepperReturn<Exclude<keyof T, symbol>, T, T[keyof T]>;
export function useStepper(steps: any, initialStep?: any): UseStepperReturn<any, any, any> {
  const stepsRef = ref<any>(steps);

  const stepNames = computed<any[]>(() =>
    isArray(stepsRef.value) ? stepsRef.value : Object.keys(stepsRef.value),
  );

  const index = ref(stepNames.value.indexOf(initialStep ?? stepNames.value[0]));

  const at = (at: number): any => {
    if (isArray(stepsRef.value))
      return stepsRef.value[at];

    return stepsRef.value[stepNames.value[at]];
  };

  const current = computed(() => at(index.value));
  const isFirst = computed(() => index.value === 0);
  const isLast = computed(() => index.value === stepNames.value.length - 1);
  const next = computed(() => stepNames.value[index.value + 1]);
  const previous = computed(() => stepNames.value[index.value - 1]);

  const get = (step: any): any => {
    if (!stepNames.value.includes(step))
      return;

    return at(stepNames.value.indexOf(step));
  };

  const goTo = (step: any): void => {
    if (stepNames.value.includes(step))
      index.value = stepNames.value.indexOf(step);
  };

  const goToNext = (): void => {
    if (isLast.value)
      return;

    index.value++;
  };

  const goToPrevious = (): void => {
    if (isFirst.value)
      return;

    index.value--;
  };

  const isNext = (step: any): boolean => stepNames.value.indexOf(step) === index.value + 1;
  const isPrevious = (step: any): boolean => stepNames.value.indexOf(step) === index.value - 1;
  const isCurrent = (step: any): boolean => stepNames.value.indexOf(step) === index.value;
  const isBefore = (step: any): boolean => index.value < stepNames.value.indexOf(step);
  const isAfter = (step: any): boolean => index.value > stepNames.value.indexOf(step);

  const goBackTo = (step: any): void => {
    if (isAfter(step))
      goTo(step);
  };

  return {
    steps: stepsRef,
    stepNames,
    index,
    current,
    next,
    previous,
    isFirst,
    isLast,
    at,
    get,
    goTo,
    goToNext,
    goToPrevious,
    goBackTo,
    isNext,
    isPrevious,
    isCurrent,
    isBefore,
    isAfter,
  };
}
