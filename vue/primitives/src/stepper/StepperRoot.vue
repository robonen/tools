<script lang="ts">
import type { StepperDirection, StepperOrientation } from './context';
import type { PrimitiveProps } from '../primitive';

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
}

export interface StepperRootEmits {
  'update:modelValue': [value: number];
}
</script>

<script setup lang="ts">
import { computed, toRef } from 'vue';
import { resolveNextIndex, rovingKeyToAction } from '../utils/roving-focus';
import { Primitive } from '../primitive';
import { provideStepperRootContext } from './context';
import { useCollectionProvider } from '../collection';
import { useConfig } from '../config-provider';
import { useForwardExpose } from '@robonen/vue';

const {
  as = 'div',
  defaultValue = 1,
  orientation = 'horizontal',
  linear = true,
  disabled = false,
  dir,
} = defineProps<StepperRootProps>();

const model = defineModel<number>();

// Uncontrolled mode: seed the active step from `defaultValue` (parent passed no `v-model`).
if (model.value === undefined)
  model.value = defaultValue;

const { forwardRef } = useForwardExpose();
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
  goToStep,
  onTriggerKeyDown,
});
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
        :go-to-step="goToStep"
      />
    </Primitive>
  </CollectionSlot>
</template>
