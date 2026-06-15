<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * An optional playhead / hover indicator, positioned at a given `time` (seconds)
 * projected through the ruler's `scale`. Purely presentational (`role` defaults
 * to `'presentation'` and it is `aria-hidden`) — it conveys no semantics of its
 * own; the playhead time should be announced by the host (e.g. a transport
 * control), not the ruler.
 *
 * When the projected pixel falls outside the visible width the cursor is hidden
 * (rendered with `visibility: hidden`) so an off-screen playhead does not bleed
 * past the ruler edges; the element stays in the tree for stable transitions.
 */
export interface TimeRulerCursorProps extends PrimitiveProps {
  /** Playhead / hover time in seconds. */
  time: number;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { useTimeRulerContext } from './context';

const { time, as = 'div' } = defineProps<TimeRulerCursorProps>();

const { forwardRef } = useForwardExpose();

const ctx = useTimeRulerContext();

const px = computed(() => ctx.scale(time));

const style = computed(() => ({
  position: 'absolute' as const,
  left: `${px.value}px`,
}));
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    role="presentation"
    aria-hidden="true"
    :data-time="time"
    :style="style"
  >
    <slot :time="time" :px="px" />
  </Primitive>
</template>
