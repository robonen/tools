<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A presentational swatch showing the current colour of the surrounding
 * `ColorFieldRoot`. It paints its `background` from the canonical colour and,
 * unless `decorative`, exposes itself as `role="img"` with an `aria-label`
 * carrying the formatted colour string so the swatch is announced to assistive
 * technology. Place it inside a `ColorFieldRoot`.
 */
export interface ColorFieldSwatchProps extends PrimitiveProps {
  /**
   * When `true`, the swatch is hidden from assistive technology
   * (`aria-hidden`) instead of being announced as an image.
   * @default false
   */
  decorative?: boolean;
  /** Override the accessible label (defaults to the formatted colour). */
  label?: string;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { formatHsva, hsvaToCss } from '../../internal/color';
import { Primitive } from '../../internal/primitive';
import { useColorFieldContext } from './context';
import { useForwardExpose } from '@robonen/vue';

const { decorative = false, label, as = 'span' } = defineProps<ColorFieldSwatchProps>();
const ctx = useColorFieldContext();

const background = computed(() => hsvaToCss(ctx.hsva.value));
const accessibleLabel = computed(() => label ?? formatHsva(ctx.hsva.value, 'hex8'));

const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :role="decorative ? undefined : 'img'"
    :aria-hidden="decorative ? '' : undefined"
    :aria-label="decorative ? undefined : accessibleLabel"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :style="{ background, backgroundColor: background }"
  >
    <slot :background="background" :label="accessibleLabel" />
  </Primitive>
</template>
