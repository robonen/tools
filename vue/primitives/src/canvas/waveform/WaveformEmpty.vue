<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * Placeholder shown when there is nothing to render — `duration === 0` or the
 * peaks array is empty (the same condition that puts `data-empty` on the root),
 * or while `loading` async peaks. Renders only in those states; the default slot
 * receives `isEmpty` / `loading` so a consumer can show a spinner vs. a "no
 * audio" message. Use this OR rely on the root's `data-empty` / `data-loading`.
 */
export interface WaveformEmptyProps extends PrimitiveProps {
  /**
   * Also render while the root is `loading`. When `false`, only renders for the
   * empty (no peaks / zero duration) state. @default true
   */
  whileLoading?: boolean;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { useWaveformContext } from './context';

const { as = 'div', whileLoading = true } = defineProps<WaveformEmptyProps>();
const ctx = useWaveformContext();
const { forwardRef } = useForwardExpose();

const visible = computed(() => ctx.isEmpty.value || (whileLoading && ctx.loading.value));
</script>

<template>
  <Primitive
    v-if="visible"
    :ref="forwardRef"
    :as="as"
    data-waveform-empty=""
    :data-loading="ctx.loading.value ? '' : undefined"
    :aria-busy="ctx.loading.value || undefined"
  >
    <slot :is-empty="ctx.isEmpty.value" :loading="ctx.loading.value" />
  </Primitive>
</template>
