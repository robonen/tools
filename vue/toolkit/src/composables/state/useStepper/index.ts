import { computed, ref } from 'vue';
import type { ComputedRef, MaybeRef, Ref } from 'vue';
import { isArray } from '@robonen/stdlib';

/** Internal name of a step: an array element or a record key. */
type StepName = string | number;
/** Internal value of a step: the array element itself or a record value. */
type StepValue = unknown;

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
export function useStepper<T extends Record<string, unknown>>(
  steps: MaybeRef<T>,
  initialStep?: keyof T,
): UseStepperReturn<Exclude<keyof T, symbol>, T, T[keyof T]>;
export function useStepper(
  steps: MaybeRef<StepName[] | Record<string, StepValue>>,
  initialStep?: StepName,
): UseStepperReturn<StepName, StepName[] | Record<string, StepValue>, StepValue> {
  const stepsRef = ref(steps) as Ref<StepName[] | Record<string, StepValue>>;

  const stepNames = computed<StepName[]>(() =>
    isArray(stepsRef.value) ? stepsRef.value : Object.keys(stepsRef.value),
  );

  // O(1) name -> index lookup, rebuilt only when the step list changes. Replaces
  // repeated O(n) `stepNames.value.indexOf(step)` scans in the predicate helpers
  // below (which are called per-render in templates). `?? -1` reproduces the
  // exact `indexOf` sentinel for unknown steps.
  const stepIndex = computed<Map<StepName, number>>(() => {
    const map = new Map<StepName, number>();
    const names = stepNames.value;
    for (let i = 0; i < names.length; i++)
      map.set(names[i]!, i);
    return map;
  });
  const indexOfStep = (step: StepName): number => stepIndex.value.get(step) ?? -1;

  const index = ref(stepNames.value.indexOf(initialStep ?? stepNames.value[0]!));

  const at = (at: number): StepValue => {
    if (isArray(stepsRef.value))
      return stepsRef.value[at];

    return stepsRef.value[stepNames.value[at]!];
  };

  const current = computed(() => at(index.value));
  const isFirst = computed(() => index.value === 0);
  const isLast = computed(() => index.value === stepNames.value.length - 1);
  const next = computed(() => stepNames.value[index.value + 1]);
  const previous = computed(() => stepNames.value[index.value - 1]);

  const get = (step: StepName): StepValue | undefined => {
    const i = indexOfStep(step);
    if (i === -1)
      return;

    return at(i);
  };

  const goTo = (step: StepName): void => {
    const i = indexOfStep(step);
    if (i !== -1)
      index.value = i;
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

  const isNext = (step: StepName): boolean => indexOfStep(step) === index.value + 1;
  const isPrevious = (step: StepName): boolean => indexOfStep(step) === index.value - 1;
  const isCurrent = (step: StepName): boolean => indexOfStep(step) === index.value;
  const isBefore = (step: StepName): boolean => index.value < indexOfStep(step);
  const isAfter = (step: StepName): boolean => index.value > indexOfStep(step);

  const goBackTo = (step: StepName): void => {
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
