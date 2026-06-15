import type { ComputedRef, Ref, ShallowRef } from 'vue';
import { useContextFactory } from '@robonen/vue';
import type { Direction } from '../../utilities/config-provider';
import type { UseSnappingReturn } from '../../internal/snapping';
import type { TimelineClip, TimelineMarker, TimelineTrack } from './utils';

/**
 * Namespaced roving-focus collection keys. Two pools live under one
 * `TimelineRoot` — clip blocks and marker pins — so they MUST use distinct keys,
 * otherwise the inner provider shadows the outer for every descendant (mirrors
 * `FLOW_NODES_COLLECTION` vs `FLOW_EDGES_COLLECTION`).
 */
export const TIMELINE_TRACKS_COLLECTION = 'timeline-tracks';
export const TIMELINE_CLIPS_COLLECTION = 'timeline-clips';

/** A marquee rectangle in viewport-relative pixels, for rendering the overlay. */
export interface TimelineMarqueeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Root context shared by every timeline part. Reactive fields are `Ref` /
 * `ShallowRef` / `ComputedRef` (never raw values — descendants would lose
 * reactivity); mutations go through the action functions so behaviour stays in
 * one place. `scale` / `invert` are stable closures safe on the pointer hot path.
 */
export interface TimelineContext {
  /** Stable id for scoping DOM ids per timeline instance. */
  timelineId: string;

  // ── coordinate model (zoom = pixels-per-second; vertical lanes fixed) ──────
  /** Left-edge time (seconds) of the visible window. Two-way via `v-model:offset`. */
  offset: Ref<number>;
  /** Zoom in pixels-per-second. Two-way via `v-model:px-per-second`. */
  pxPerSecond: Ref<number>;
  /** Total content duration in seconds. */
  duration: ComputedRef<number>;
  /** Frame rate (for timecode + frame snapping). */
  fps: Ref<number>;
  /** Default track-lane height in pixels (fixed; NOT zoomed). */
  trackHeight: Ref<number>;
  /** Live width (px) of the tracks viewport; `scale` range is `[0, width]`. */
  viewportWidth: Ref<number>;
  /** Project a time (seconds) to a pixel offset in the viewport. Stable identity. */
  scale: (seconds: number) => number;
  /** Invert a pixel offset back to a time (seconds). Stable identity. Returns 0 pre-measure. */
  invert: (px: number) => number;
  /** Snap a time to the nearest whole frame at `fps`. */
  snapToFrame: (seconds: number) => number;
  /** Format a time (seconds) as `HH:MM:SS:FF` timecode. */
  formatTimecode: (seconds: number) => string;

  // ── capability flags ──────────────────────────────────────────────────────
  /** Snapping master enable. */
  snapping: Ref<boolean>;
  /** Master interactivity / disabled switch. */
  disabled: Ref<boolean>;
  /** Resolved reading direction. */
  direction: ComputedRef<Direction>;

  // ── data access (immutable shallow Maps — replace items, never mutate) ─────
  /** Read path for tracks, keyed by id. */
  trackLookup: ShallowRef<Map<string, TimelineTrack>>;
  /** Read path for clips, keyed by id. */
  clipLookup: ShallowRef<Map<string, TimelineClip>>;
  /** Read path for markers, keyed by id. */
  markerLookup: ShallowRef<Map<string, TimelineMarker>>;
  /** Ordered track ids (declaration order). */
  trackIds: ComputedRef<string[]>;
  /** Ordered clip ids (sorted by start time, for roving focus). */
  orderedClipIds: ComputedRef<string[]>;
  /** Ordered marker ids (sorted by time). */
  orderedMarkerIds: ComputedRef<string[]>;
  /**
   * The single roving tab-stop clip id (first selected clip in time order, else
   * the first clip). Computed once in the Root so each clip does an O(1) check.
   */
  tabStopClipId: ComputedRef<string | undefined>;
  /** Canonical selected-clip id set (replace wholesale). O(1) membership. */
  selectedClipIds: ShallowRef<Set<string>>;
  /** Live current time (playhead) in seconds. Two-way via `v-model:current-time`. */
  currentTime: Ref<number>;

  // ── shared snap engine ────────────────────────────────────────────────────
  /** The shared snap engine; targets = clip edges + playhead + markers + grid. */
  snapEngine: UseSnappingReturn;
  /** Snap a candidate time, excluding an optional set of ids (a clip's own edges). */
  snapTime: (seconds: number, exclude?: string | Set<string>) => number;

  // ── mutation state ────────────────────────────────────────────────────────
  /** True while a clip/playhead/trim gesture is mutating (blocks external sync clobber). */
  isMutating: Readonly<Ref<boolean>>;
  /** The id of the clip currently being dragged/trimmed (or null). */
  draggingClipId: Readonly<Ref<string | null>>;

  // ── track actions ─────────────────────────────────────────────────────────
  /** Shallow-merge a partial into a track in the model + emit a `patch` change. */
  patchTrack: (id: string, patch: Partial<TimelineTrack>) => void;

  // ── clip actions ──────────────────────────────────────────────────────────
  /** Insert a clip + emit an `add` change. */
  addClip: (clip: TimelineClip) => void;
  /** Patch a clip in the model + emit the matching change(s). */
  updateClip: (id: string, patch: Partial<TimelineClip>) => void;
  /** Remove a clip + emit a `remove` change. */
  removeClip: (id: string) => void;
  /** Split a clip at a time + emit a `split` change. */
  splitClip: (id: string, at: number) => void;
  /** Move a clip (transient overlay, snapped); commit on pointerup. */
  moveClip: (id: string, start: number, trackId: string, mutating: boolean) => void;
  /** Trim a clip start/duration (transient overlay, snapped); commit on pointerup. */
  trimClip: (id: string, start: number, duration: number, mutating: boolean) => void;
  /** Commit the in-flight transient mutation into the model (one change batch). */
  commitMutation: () => void;
  /** Nudge every selected clip by `deltaSeconds` (keyboard), then commit. */
  nudgeSelected: (deltaSeconds: number) => void;
  /** Move every selected clip up/down one track (keyboard), then commit. */
  moveSelectedToAdjacentTrack: (direction: 1 | -1) => void;
  /** Remove every selected clip + emit changes. */
  removeSelected: () => void;

  // ── playhead ──────────────────────────────────────────────────────────────
  /** Set the playhead time (clamped, optionally snapped). Marks `isMutating` while scrubbing. */
  setCurrentTime: (seconds: number, scrubbing?: boolean) => void;
  /** End a scrub gesture (clears `isMutating`, emits the settle). */
  commitScrub: () => void;

  // ── selection ─────────────────────────────────────────────────────────────
  /** Replace the selection with one clip (or toggle when `additive`). */
  selectClip: (id: string, additive?: boolean) => void;
  /** Replace the entire selected set. */
  setSelection: (ids: string[]) => void;
  /** Clear all selection. */
  clearSelection: () => void;

  // ── roving focus registration ─────────────────────────────────────────────
  /** Register a clip element for roving focus / marquee hit-testing. */
  registerClipEl: (id: string, el: HTMLElement) => void;
  unregisterClipEl: (id: string) => void;
  /** Register a marker element for roving focus. */
  registerMarkerEl: (id: string, el: HTMLElement) => void;
  unregisterMarkerEl: (id: string) => void;
  /** Focus the next/prev clip in time order from `fromId` (roving). */
  focusAdjacentClip: (fromId: string, direction: 1 | -1) => void;
  /** Focus a clip element by id (roving Home/End). */
  focusClip: (id: string) => void;

  // ── viewport ──────────────────────────────────────────────────────────────
  /** The tracks viewport element (marquee + scrub rect origin). */
  viewportEl: ShallowRef<HTMLElement | null>;
  /** Live marquee rect (viewport-relative px), or null. */
  marquee: ShallowRef<TimelineMarqueeRect | null>;
}

const timeline = useContextFactory<TimelineContext>('TimelineContext');
export const provideTimelineContext = timeline.provide;
export const useTimelineContext = timeline.inject;

/**
 * Per-track sub-context. Read by `TimelineTrackHeader` and clips so they never
 * DOM-walk to find their lane's state.
 */
export interface TimelineTrackContext {
  trackId: string;
  /** The track record (reactive). */
  track: ComputedRef<TimelineTrack | undefined>;
  /** Resolved lane height (px). */
  height: ComputedRef<number>;
  /** Toggle a boolean track flag (mute/lock/solo) + emit a track change. */
  toggleFlag: (flag: 'muted' | 'locked' | 'soloed') => void;
  /** Patch the track (e.g. height resize) + emit a track change. */
  patchTrack: (patch: Partial<TimelineTrack>) => void;
}

const timelineTrack = useContextFactory<TimelineTrackContext>('TimelineTrackContext');
export const provideTimelineTrackContext = timelineTrack.provide;
export const useTimelineTrackContext = timelineTrack.inject;
