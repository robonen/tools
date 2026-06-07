<script lang="ts">
import type { StepperDirection, StepperOrientation } from './context';
import type { PrimitiveProps } from '../primitive';

export interface StepperRootProps extends PrimitiveProps {
  /** Controlled active step (1-based). Use `v-model`. */
  modelValue?: number;
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
import { computed, ref, toRef, watch } from 'vue';
import { resolveNextIndex, rovingKeyToAction } from '../utils/roving-focus';
import { Primitive } from '../primitive';
import { provideStepperRootContext } from './context';
import { useCollectionProvider } from '../collection';
import { useConfig } from '../config-provider';
import { useForwardExpose } from '@robonen/vue';

const {
  as = 'div',
  modelValue,
  defaultValue = 1,
  orientation = 'horizontal',
  linear = true,
  disabled = false,
  dir,
} = defineProps<StepperRootProps>();

const emit = defineEmits<StepperRootEmits>();

const { forwardRef } = useForwardExpose();
const config = useConfig();

const direction = computed(() => dir ?? config.dir.value);

const localValue = ref<number>(modelValue ?? defaultValue);

watch(() => modelValue, (v) => {
  if (v === undefined || v === localValue.value) return;
  localValue.value = v;
});

const { getItems, CollectionSlot } = useCollectionProvider();
const total = computed(() => getItems(true).length);

function commit(next: number): void {
  if (next === localValue.value) return;
  localValue.value = next;
  emit('update:modelValue', next);
}

function goToStep(step: number): void {
  if (disabled || step < 1) return;
  const items = getItems(true);
  const count = items.length;
  if (count > 0 && step > count) return;
  // respect linear gate — at most one step ahead of current.
  if (linear && step > localValue.value + 1) return;
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
  value: localValue,
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
        :value="localValue"
        :total="total"
        :go-to-step="goToStep"
      />
    </Primitive>
  </CollectionSlot>
</template>
