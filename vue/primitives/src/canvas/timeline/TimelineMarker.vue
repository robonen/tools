<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A marker pin at `marker.time`. Positioned at `scale(marker.time)`. It is a
 * roving-focus stop, `role="button"` with an `aria-label` (label + timecode).
 */
export interface TimelineMarkerProps extends PrimitiveProps {
  /** Id of the marker this pin renders. */
  markerId: string;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue';
import { Primitive } from '../../internal/primitive';
import { useTimelineContext } from './context';

const { markerId, as = 'button' } = defineProps<TimelineMarkerProps>();

const ctx = useTimelineContext();
const el = shallowRef<HTMLElement | null>(null);

const marker = computed(() => ctx.markerLookup.value.get(markerId));
const left = computed(() => ctx.scale(marker.value?.time ?? 0));

const ariaLabel = computed(() => {
  const m = marker.value;
  if (!m) return 'marker';
  const name = m.label ?? 'Marker';
  return `${name}, ${ctx.formatTimecode(m.time)}`;
});

// First marker in time order is the roving tab-stop.
const isTabStop = computed(() => ctx.orderedMarkerIds.value[0] === markerId);

watch(el, (node) => {
  if (node) ctx.registerMarkerEl(markerId, node);
});
onBeforeUnmount(() => ctx.unregisterMarkerEl(markerId));

function onClick(): void {
  const m = marker.value;
  if (!m || ctx.disabled.value) return;
  ctx.setCurrentTime(m.time, false);
  ctx.commitScrub();
}

function setRef(node: unknown): void {
  el.value = (node && typeof node === 'object' && '$el' in node ? (node as { $el: HTMLElement }).$el : node) as HTMLElement | null;
}
</script>

<template>
  <Primitive
    :ref="setRef"
    :as="as"
    :role="as === 'button' ? undefined : 'button'"
    :type="as === 'button' ? 'button' : undefined"
    :aria-label="ariaLabel"
    :data-marker-id="markerId"
    :tabindex="ctx.disabled.value ? undefined : (isTabStop ? 0 : -1)"
    :style="{
      position: 'absolute',
      left: `${left}px`,
      top: '0',
    }"
    @click="onClick"
  >
    <slot :marker="marker" />
  </Primitive>
</template>
