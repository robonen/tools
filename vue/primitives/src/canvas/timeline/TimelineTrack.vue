<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * One track lane. Looks its track record up from the Root by `trackId`, applies
 * the resolved (fixed, non-zoomed) lane height, and provides `TimelineTrackContext`
 * to its header + clips. `role="row"` within the `TimelineTracks` grid; surfaces
 * `data-muted` / `data-locked` / `data-soloed`. The default slot receives the
 * track record + flags.
 */
export interface TimelineTrackProps extends PrimitiveProps {
  /** Id of the track this lane renders. */
  trackId: string;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { Primitive } from '../../internal/primitive';
import { provideTimelineTrackContext, useTimelineContext } from './context';
import type { TimelineTrack } from './utils';

const { trackId, as = 'div' } = defineProps<TimelineTrackProps>();

const ctx = useTimelineContext();

const track = computed(() => ctx.trackLookup.value.get(trackId));
const height = computed(() => track.value?.height ?? ctx.trackHeight.value);

function toggleFlag(flag: 'muted' | 'locked' | 'soloed'): void {
  const current = track.value;
  if (!current) return;
  ctx.patchTrack(trackId, { [flag]: !current[flag] });
}

function patchTrack(patch: Partial<TimelineTrack>): void {
  ctx.patchTrack(trackId, patch);
}

provideTimelineTrackContext({
  trackId,
  track,
  height,
  toggleFlag,
  patchTrack,
});
</script>

<template>
  <Primitive
    :as="as"
    role="row"
    :data-track-id="trackId"
    :data-muted="track?.muted ? '' : undefined"
    :data-locked="track?.locked ? '' : undefined"
    :data-soloed="track?.soloed ? '' : undefined"
    :data-hidden="track?.hidden ? '' : undefined"
    :style="{ height: `${height}px` }"
  >
    <slot
      :track="track"
      :height="height"
    />
  </Primitive>
</template>
