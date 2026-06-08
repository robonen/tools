<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface CommandLoadingProps extends PrimitiveProps {
  /** Accessible label describing the loading state. */
  label?: string;
  /** Optional 0..100 progress value — published via `aria-valuenow`. */
  progress?: number;
}
</script>

<script setup lang="ts">
import { useForwardExpose } from '@robonen/vue';

import { Primitive } from '../primitive';

const {
  as = 'div',
  label = 'Loading',
  progress,
} = defineProps<CommandLoadingProps>();

const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="progressbar"
    :aria-valuetext="label"
    :aria-valuenow="progress"
    :aria-valuemin="progress === undefined ? undefined : 0"
    :aria-valuemax="progress === undefined ? undefined : 100"
    aria-live="polite"
    data-primitives-command-loading
  >
    <slot :progress="progress" />
  </Primitive>
</template>
