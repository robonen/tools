<script lang="ts">
import type { LevelsHandleKind } from './utils';
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A visible, editable numeric entry box bound to one levels `kind` — the precise
 * and screen-reader-friendly path for entering a handle value. It composes the
 * `NumberField` family (`NumberFieldRoot` / `NumberFieldInput` /
 * `NumberFieldIncrement` / `NumberFieldDecrement`) wired to the enclosing
 * `LevelsRoot`: typing or stepping writes back through the same
 * neighbour-clamped setter the thumb uses, so input black can never cross input
 * white. The field's `min`/`max`/`step` track the handle's current legal range
 * (gamma uses `gammaStep` and the `0.1..9.99` bounds). The default slot exposes
 * the `NumberField` parts for full layout control; omit it for a stepper-free
 * input.
 */
export interface LevelsHandleValueProps extends PrimitiveProps {
  /** Which handle this entry box edits. */
  kind: LevelsHandleKind;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import {
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
  NumberFieldRoot,
} from '../../forms/number-field';
import { useLevelsContext } from './context';
import { LEVELS_HANDLE_LABELS, handleBounds } from './utils';

const { kind, as = 'div' } = defineProps<LevelsHandleValueProps>();
const ctx = useLevelsContext();

const isGamma = computed(() => kind === 'gamma');

/** The handle's live value (the gamma factor for `kind: 'gamma'`). */
const handleNumber = computed(() => (isGamma.value ? ctx.value.value.gamma : ctx.value.value[kind]));

/** Step for the field — `gammaStep` for gamma, otherwise the shared step. */
const fieldStep = computed(() => (isGamma.value ? ctx.gammaStep.value : ctx.step.value));

/** Live neighbour-aware bounds so the field clamps exactly like the thumb. */
const bounds = computed(() => handleBounds(kind, ctx.value.value, ctx.minStepsBetweenHandles.value * ctx.step.value));

const ariaLabel = computed(() => LEVELS_HANDLE_LABELS[kind]);

/**
 * Route a NumberField write back through the levels setter (which re-applies
 * snapping + neighbour clamping). `null` (cleared field) is ignored — the handle
 * keeps its last value.
 */
function onValueChange(next: number | null): void {
  if (next === null) return;
  ctx.setHandle(kind, next);
}
</script>

<template>
  <NumberFieldRoot
    :as="as"
    :model-value="handleNumber"
    :min="bounds.min"
    :max="bounds.max"
    :step="fieldStep"
    :disabled="ctx.disabled.value"
    v-bind="{ 'data-kind': kind }"
    @value-change="onValueChange"
  >
    <slot
      :value="handleNumber"
      :min="bounds.min"
      :max="bounds.max"
      :step="fieldStep"
    >
      <NumberFieldDecrement v-bind="{ 'aria-label': `Decrease ${ariaLabel}` }" />
      <NumberFieldInput v-bind="{ 'aria-label': ariaLabel }" />
      <NumberFieldIncrement v-bind="{ 'aria-label': `Increase ${ariaLabel}` }" />
    </slot>
  </NumberFieldRoot>
</template>
