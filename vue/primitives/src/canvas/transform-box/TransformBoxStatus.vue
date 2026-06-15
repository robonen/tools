<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';
import type { TransformBoxValue } from './utils';

/**
 * An optional visually-hidden `aria-live="polite"` region that announces the
 * live numeric transform (x / y / width / height / rotation) to assistive
 * technology when a gesture SETTLES — continuous drag feedback is otherwise
 * purely visual. It mirrors the standard slider/spinbutton pattern of pairing a
 * visual control with a text status.
 *
 * The announcement is debounced to a settle: it updates on the committed value
 * (not every drag frame) so screen readers are not flooded. Override the wording
 * with the `format` prop.
 */
export interface TransformBoxStatusProps extends PrimitiveProps {
  /**
   * Format the announced string from the current transform. Defaults to a
   * compact `x, y, width × height, rotation°` summary with rounded values.
   * @default (v) => `x ${round(v.x)}, y ${round(v.y)}, width ${round(v.width)}, height ${round(v.height)}, rotation ${round(v.rotation)} degrees`
   */
  format?: (value: TransformBoxValue) => string;
}

/** Compact `x, y, width, height, rotation degrees` summary with rounded values. */
function defaultFormat(v: TransformBoxValue): string {
  const r = (n: number) => Math.round(n);
  return `x ${r(v.x)}, y ${r(v.y)}, width ${r(v.width)}, height ${r(v.height)}, rotation ${r(v.rotation)} degrees`;
}
</script>

<script setup lang="ts">
import { shallowRef, watch } from 'vue';
import { Primitive } from '../../internal/primitive';
import { useForwardExpose } from '@robonen/vue';
import { useTransformBoxContext } from './context';

const { as = 'span', format = defaultFormat } = defineProps<TransformBoxStatusProps>();
const ctx = useTransformBoxContext();

// Announce only on settle: hold the message blank while a gesture is in flight
// and publish the committed transform once `transforming` drops to false. This
// avoids flooding the live region every drag frame.
const message = shallowRef('');

watch(
  () => [ctx.transforming.value, ctx.value.value] as const,
  ([transforming, value]) => {
    if (transforming) return;
    message.value = format(value);
  },
  { immediate: true, deep: false },
);

const visuallyHiddenStyle = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: '0',
} as const;

const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="status"
    aria-live="polite"
    aria-atomic="true"
    :style="visuallyHiddenStyle"
  >
    <slot :message="message">{{ message }}</slot>
  </Primitive>
</template>
