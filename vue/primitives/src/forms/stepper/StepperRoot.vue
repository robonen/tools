<script lang="ts">
import type { StepperDirection, StepperOrientation } from './context';
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A multi-step progress control that guides users through a sequence of steps —
 * checkout flows, onboarding wizards, or any task split into ordered stages.
 * Use it when you need to show where the user is, which steps are done, and
 * (optionally) let them jump between steps.
 *
 * The root owns the active step (1-based), tracks the total via the Collection,
 * arbitrates linear vs. free navigation, handles roving keyboard focus across
 * triggers, and provides context to every `StepperItem`.
 */
export interface StepperRootProps extends PrimitiveProps {
  /** Uncontrolled initial step. @default 1 */
  defaultValue?: number;
  /** Orientation. @default 'horizontal' */
  orientation?: StepperOrientation;
  /** Writing direction. Falls back to `ConfigProvider` when omitted. */
  dir?: StepperDirection;
  /** Require steps to be completed in order. @default true */
  linear?: boolean;
  /** Disable the entire stepper. */
  disabled?: boolean;
  /**
   * Builds the message announced to screen readers via the visually-hidden
   * live region whenever the active step changes. Override for i18n.
   * @default ({ value, total }) => `Step ${value} of ${total}`
   */
  announceLabel?: (state: { value: number; total: number }) => string;
}

export interface StepperRootEmits {
  'update:modelValue': [value: number];
}

export interface StepperRootSlotProps {
  /** Current active step (1-based). */
  value: number;
  /** Total number of registered steps. */
  total: number;
  /** `true` when the active step is the first step. */
  isFirstStep: boolean;
  /** `true` when the active step is the last step. */
  isLastStep: boolean;
  /** `true` when the next step's trigger is disabled (or absent). */
  isNextDisabled: boolean;
  /** `true` when the previous step's trigger is disabled (or absent). */
  isPrevDisabled: boolean;
  /** Navigate to an absolute step (1-based). */
  goToStep: (step: number) => void;
  /** Navigate to the next step. */
  goToNextStep: () => void;
  /** Navigate to the previous step. */
  goToPrevStep: () => void;
  /** `true` when there is a step after the active one. */
  hasNext: () => boolean;
  /** `true` when there is a step before the active one. */
  hasPrev: () => boolean;
}
</script>

<script setup lang="ts">
import { computed, toRef } from 'vue';
import { resolveNextIndex, rovingKeyToAction } from '../../internal/utils/roving-focus';
import { Primitive } from '../../internal/primitive';
import { VisuallyHidden } from '../../utilities/visually-hidden';
import { provideStepperRootContext } from './context';
import { useCollectionProvider } from '../../utilities/collection';
import { useConfig } from '../../utilities/config-provider';
import { useForwardExpose } from '@robonen/vue';

const {
  as = 'div',
  defaultValue = 1,
  orientation = 'horizontal',
  linear = true,
  disabled = false,
  dir,
  announceLabel,
} = defineProps<StepperRootProps>();

defineSlots<{
  default?: (props: StepperRootSlotProps) => unknown;
}>();

const model = defineModel<number>();

// Uncontrolled mode: seed the active step from `defaultValue` (parent passed no `v-model`).
if (model.value === undefined)
  model.value = defaultValue;

const config = useConfig();

const direction = computed(() => dir ?? config.dir.value);

// Always a defined step for consumers — `model` is seeded above and the setter clamps to numbers.
const value = computed(() => model.value ?? defaultValue);

const { getItems, CollectionSlot } = useCollectionProvider();
const total = computed(() => getItems(true).length);

function commit(next: number): void {
  if (next === model.value) return;
  model.value = next;
}

function goToStep(step: number): void {
  if (disabled || step < 1) return;
  const items = getItems(true);
  const count = items.length;
  if (count > 0 && step > count) return;
  // respect linear gate — at most one step ahead of current.
  if (linear && step > value.value + 1) return;
  // skip if target item is marked disabled in DOM.
  const target = items[step - 1]?.ref;
  if (target?.hasAttribute('data-disabled')) return;
  commit(step);
}

function goToNextStep(): void {
  goToStep(value.value + 1);
}

function goToPrevStep(): void {
  goToStep(value.value - 1);
}

function hasNext(): boolean {
  return value.value < total.value;
}

function hasPrev(): boolean {
  return value.value > 1;
}

const isFirstStep = computed(() => value.value <= 1);
const isLastStep = computed(() => total.value > 0 && value.value >= total.value);

// Boundary or DOM-disabled state of the adjacent triggers — lets consumers wire
// Next/Prev buttons without re-deriving step math themselves.
const isNextDisabled = computed(() => {
  if (disabled || !hasNext()) return true;
  const next = getItems(true)[value.value]?.ref;
  return next ? next.hasAttribute('data-disabled') : true;
});
const isPrevDisabled = computed(() => {
  if (disabled || !hasPrev()) return true;
  const prev = getItems(true)[value.value - 2]?.ref;
  return prev ? prev.hasAttribute('data-disabled') : true;
});

function onTriggerKeyDown(event: KeyboardEvent, el: HTMLElement): void {
  const action = rovingKeyToAction(event, {
    orientation,
    dir: direction.value,
    loop: false,
  });
  if (!action) return;
  event.preventDefault();
  // Collect enabled triggers with a single pass (PACKED array via push — no filter closure).
  const items = getItems(true);
  const enabled: HTMLElement[] = [];
  for (let i = 0; i < items.length; i++) {
    const ref = items[i]!.ref;
    if (!ref.hasAttribute('data-disabled')) enabled.push(ref);
  }
  if (enabled.length === 0) return;
  if (action.absolute === 'home') {
    enabled[0]!.focus();
    return;
  }
  if (action.absolute === 'end') {
    enabled[enabled.length - 1]!.focus();
    return;
  }
  const current = enabled.indexOf(el);
  const nextIdx = resolveNextIndex(current === -1 ? 0 : current, action.delta, enabled.length, false);
  enabled[nextIdx]!.focus();
}

provideStepperRootContext({
  value,
  total,
  orientation: toRef(() => orientation),
  direction,
  linear: toRef(() => linear),
  disabled: toRef(() => disabled),
  isFirstStep,
  isLastStep,
  isNextDisabled,
  isPrevDisabled,
  goToStep,
  goToNextStep,
  goToPrevStep,
  hasNext,
  hasPrev,
  onTriggerKeyDown,
});

const announcement = computed(() => announceLabel
  ? announceLabel({ value: value.value, total: total.value })
  : `Step ${value.value} of ${total.value}`);

defineExpose({
  /** Current active step (1-based). */
  value,
  /** Total number of registered steps. */
  total,
  isFirstStep,
  isLastStep,
  isNextDisabled,
  isPrevDisabled,
  goToStep,
  goToNextStep,
  goToPrevStep,
  hasNext,
  hasPrev,
});

// `useForwardExpose` runs AFTER `defineExpose` so the composable merges the
// prior expose bindings (plus props + `$el`) instead of `defineExpose`'s
// `expose()` clobbering them and warning "expose() should be called only once".
const { forwardRef } = useForwardExpose();
</script>

<template>
  <CollectionSlot>
    <Primitive
      :ref="forwardRef"
      :as="as"
      role="group"
      aria-label="progress"
      :data-orientation="orientation"
      :data-linear="linear ? '' : undefined"
      :data-disabled="disabled ? '' : undefined"
      :dir="direction"
    >
      <slot
        :value="value"
        :total="total"
        :is-first-step="isFirstStep"
        :is-last-step="isLastStep"
        :is-next-disabled="isNextDisabled"
        :is-prev-disabled="isPrevDisabled"
        :go-to-step="goToStep"
        :go-to-next-step="goToNextStep"
        :go-to-prev-step="goToPrevStep"
        :has-next="hasNext"
        :has-prev="hasPrev"
      />

      <VisuallyHidden
        v-if="as !== 'template'"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {{ announcement }}
      </VisuallyHidden>
    </Primitive>
  </CollectionSlot>
</template>
