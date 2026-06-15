<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The marquee selection rectangle overlay. It reads the live marquee geometry
 * the `TimelineTracks` viewport publishes on the context and renders an
 * absolutely-positioned box (viewport-relative pixels). It renders nothing when
 * no marquee is active. The default slot receives the live `rect` so a consumer
 * can render its own visual; the part also exposes `data-timeline-selection`.
 */
export type TimelineSelectionProps = PrimitiveProps;
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { Primitive } from '../../internal/primitive';
import { useTimelineContext } from './context';

const { as = 'div' } = defineProps<TimelineSelectionProps>();

const ctx = useTimelineContext();
const rect = computed(() => ctx.marquee.value);
</script>

<template>
  <Primitive
    v-if="rect"
    :as="as"
    data-timeline-selection
    aria-hidden="true"
    :style="{
      position: 'absolute',
      left: `${rect.x}px`,
      top: `${rect.y}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      pointerEvents: 'none',
    }"
  >
    <slot :rect="rect" />
  </Primitive>
</template>
