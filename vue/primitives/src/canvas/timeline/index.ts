export { default as TimelineRoot } from './TimelineRoot.vue';
export type { TimelineRootProps, TimelineRootEmits } from './TimelineRoot.vue';

export { default as TimelineRuler } from './TimelineRuler.vue';
export type { TimelineRulerProps } from './TimelineRuler.vue';

export { default as TimelineTracks } from './TimelineTracks.vue';
export type { TimelineTracksProps } from './TimelineTracks.vue';

export { default as TimelineTrack } from './TimelineTrack.vue';
export type { TimelineTrackProps } from './TimelineTrack.vue';

export { default as TimelineTrackHeader } from './TimelineTrackHeader.vue';
export type { TimelineTrackHeaderProps } from './TimelineTrackHeader.vue';

export { default as TimelineClip } from './TimelineClip.vue';
export type { TimelineClipProps } from './TimelineClip.vue';

export { default as TimelineClipHandle } from './TimelineClipHandle.vue';
export type { TimelineClipHandleProps } from './TimelineClipHandle.vue';

export { default as TimelinePlayhead } from './TimelinePlayhead.vue';
export type { TimelinePlayheadProps } from './TimelinePlayhead.vue';

export { default as TimelineMarker } from './TimelineMarker.vue';
export type { TimelineMarkerProps } from './TimelineMarker.vue';

export { default as TimelineSelection } from './TimelineSelection.vue';
export type { TimelineSelectionProps } from './TimelineSelection.vue';

export {
  TIMELINE_CLIPS_COLLECTION,
  TIMELINE_TRACKS_COLLECTION,
  provideTimelineContext,
  provideTimelineTrackContext,
  useTimelineContext,
  useTimelineTrackContext,
} from './context';
export type {
  TimelineContext,
  TimelineMarqueeRect,
  TimelineTrackContext,
} from './context';

export {
  applyClipChanges,
  applyTrackChanges,
} from './changes';
export type {
  TimelineClipChange,
  TimelineTrackChange,
} from './changes';

export {
  clipIntersectsTime,
  clipsDuration,
  snapToFrame,
  timeToTimecode,
} from './utils';
// Data interfaces are aliased with a `Data` suffix so they do not collide with
// the same-named part components (`TimelineClip` / `TimelineMarker` / `Track`).
export type {
  TimelineClip as TimelineClipData,
  TimelineMarker as TimelineMarkerData,
  TimelineTrack as TimelineTrackData,
} from './utils';
