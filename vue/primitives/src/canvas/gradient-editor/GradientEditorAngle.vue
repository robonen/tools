<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * Optional angle control for the linear gradient, wrapping an `AngleDialRoot` +
 * `AngleDialThumb` bound to the root's `angle` model. It renders nothing when
 * the gradient `type` is `'radial'` (the angle is meaningless there). Compose
 * the dial's slot to position the thumb, or pass your own children via the
 * default slot (which receives `{ angle }`).
 */
export interface GradientEditorAngleProps extends PrimitiveProps {
  /** Min angle in degrees. @default 0 */
  min?: number;
  /** Max angle in degrees. @default 360 */
  max?: number;
  /** Step granularity in degrees. @default 1 */
  step?: number;
  /** Large step (Page keys / Shift+Arrow) in degrees. @default 15 */
  largeStep?: number;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { AngleDialRoot, AngleDialThumb } from '../angle-dial';
import { useForwardExpose } from '@robonen/vue';
import { useGradientEditorContext } from './context';

const {
  as = 'div',
  min = 0,
  max = 360,
  step = 1,
  largeStep = 15,
} = defineProps<GradientEditorAngleProps>();

const ctx = useGradientEditorContext();
const { forwardRef } = useForwardExpose();

// Two-way bridge between AngleDial's `v-model:value` and the gradient's angle.
// The setter widens to AngleDial's `number | null` model contract.
const angle = computed<number | null | undefined>({
  get: () => ctx.angle.value,
  set: (v) => {
    if (v === null || v === undefined) return;
    ctx.setAngle(v);
  },
});

const isLinear = computed(() => ctx.type.value === 'linear');
</script>

<template>
  <AngleDialRoot
    v-if="isLinear"
    :ref="forwardRef"
    :as="as"
    v-model:value="angle"
    :min="min"
    :max="max"
    :step="step"
    :large-step="largeStep"
    :disabled="ctx.disabled.value"
    :dir="ctx.direction.value"
  >
    <slot :angle="angle">
      <AngleDialThumb aria-label="Gradient angle" />
    </slot>
  </AngleDialRoot>
</template>
