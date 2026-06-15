<script lang="ts">
import type { Ref } from 'vue';
import type { PrimitiveProps } from '../../internal/primitive';
import type { Direction } from '../../utilities/config-provider';
import type { TimelineClip, TimelineMarker, TimelineTrack } from './utils';
import type { TimelineClipChange, TimelineTrackChange } from './changes';

/**
 * Root of the headless multi-track timeline (video/audio editor). It owns the
 * track / clip / marker data plus the playhead (`currentTime`), horizontal scroll
 * (`offset`), zoom (`pxPerSecond`), and selection — all two-way via `v-model` or
 * uncontrolled via `default*`. The public arrays are reconciled into internal
 * `shallowRef` Maps for O(1) reads and identity-stable per-item computeds.
 *
 * The COORDINATE MODEL is load-bearing: `pxPerSecond` is applied as real
 * horizontal LAYOUT pixels (clip widths are genuine px, never a CSS
 * `scale(zoom)`), so a `useScale` projects the visible window
 * `[offset, offset + width/pxPerSecond]` → `[0, width]`. The vertical axis is
 * fixed-height track lanes and is NOT zoomed.
 *
 * Transient drag/trim/scrub positions are written to an in-flight overlay and
 * committed to the model on pointerup (`commitMutation`); an external `v-model`
 * write during a gesture is ignored (the `isMutating` early-return) so it never
 * clobbers the live drag. Granular `@clips-change` / `@tracks-change` are emitted
 * alongside `v-model` so consumers may own their data via `applyClipChanges` /
 * `applyTrackChanges`.
 *
 * Provides `TimelineContext` to every part: the scale, the shared snap engine
 * (clip edges + playhead + markers + grid), the clip/track/playhead actions, and
 * the roving-focus registry.
 */
export interface TimelineRootProps extends PrimitiveProps {
  /** Uncontrolled initial tracks (ignored when `v-model:tracks` is bound). */
  defaultTracks?: TimelineTrack[];
  /** Uncontrolled initial clips. */
  defaultClips?: TimelineClip[];
  /** Uncontrolled initial markers. */
  defaultMarkers?: TimelineMarker[];
  /** Uncontrolled initial playhead time (seconds). @default 0 */
  defaultCurrentTime?: number;
  /** Uncontrolled initial left-edge time (seconds). @default 0 */
  defaultOffset?: number;
  /** Uncontrolled initial zoom in pixels-per-second. @default 100 */
  defaultPxPerSecond?: number;
  /** Uncontrolled initial selected clip ids. */
  defaultSelectedClipIds?: string[];
  /**
   * Total content duration in seconds. When omitted it is auto-derived from the
   * clips (largest `start + duration`).
   * @default auto
   */
  duration?: number;
  /** Minimum zoom in pixels-per-second; `pxPerSecond` is clamped to this. @default 2 */
  minPxPerSecond?: number;
  /** Maximum zoom in pixels-per-second. @default 2000 */
  maxPxPerSecond?: number;
  /** Frame rate (timecode + frame snapping + keyboard nudge). @default 30 */
  fps?: number;
  /**
   * Snap step in seconds. When omitted it defaults to one frame (`1 / fps`).
   * @default 1/fps
   */
  snapStep?: number;
  /** Enable magnetic snapping to clip edges / playhead / markers / grid. @default true */
  snapping?: boolean;
  /** Snap radius in pixels. @default 8 */
  snapThresholdPx?: number;
  /** Default track-lane height in pixels (fixed; NOT zoomed). @default 64 */
  trackHeight?: number;
  /** Disable all interaction. @default false */
  disabled?: boolean;
  /**
   * Writing direction. When omitted it is inherited from the nearest
   * `ConfigProvider` (falling back to `'ltr'`); an explicit value wins.
   */
  dir?: Direction;
}

// `update:*` events are declared by their `defineModel`s and must NOT be
// re-declared here. These are the granular change + settle events.
export interface TimelineRootEmits {
  /** Granular clip mutations (move/trim/split/remove/add/select). */
  clipsChange: [changes: TimelineClipChange[]];
  /** Granular track mutations (flag toggles / resize / add / remove). */
  tracksChange: [changes: TimelineTrackChange[]];
  /** Emitted when a clip drag/trim gesture settles, with the affected ids. */
  clipCommit: [ids: string[]];
  /** Emitted when a scrub gesture settles, with the final time (seconds). */
  scrubCommit: [time: number];
  /** Emitted when the selected-clip set changes, with the new ids. */
  selectionChange: [ids: string[]];
}
</script>

<script setup lang="ts">
import { computed, shallowRef, toRef, triggerRef, watch } from 'vue';
import { clamp } from '@robonen/stdlib';
import { useElementSize, useForwardExpose, useId } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { useDirection } from '../../utilities/config-provider';
import { useScale } from '../../internal/scale';
import { edgeTargets, gridTargets, pointTargets, useSnapping } from '../../internal/snapping';
import type { SnapTarget } from '../../internal/snapping';
import { provideTimelineContext } from './context';
import type { TimelineContext, TimelineMarqueeRect } from './context';
import { clipsDuration, snapToFrame, timeToTimecode } from './utils';

const {
  defaultTracks,
  defaultClips,
  defaultMarkers,
  defaultCurrentTime,
  defaultOffset,
  defaultPxPerSecond,
  defaultSelectedClipIds,
  duration: durationProp,
  minPxPerSecond = 2,
  maxPxPerSecond = 2000,
  fps = 30,
  snapStep,
  snapping = true,
  snapThresholdPx = 8,
  trackHeight = 64,
  disabled = false,
  dir,
  as = 'div',
} = defineProps<TimelineRootProps>();

const emit = defineEmits<TimelineRootEmits>();

const timelineId = useId(undefined, 'timeline').value;
const direction = useDirection(() => dir);

// ── models (controlled + uncontrolled) ──────────────────────────────────────
const localTracks = shallowRef<TimelineTrack[]>(defaultTracks ? defaultTracks.slice() : []);
const tracks = defineModel<TimelineTrack[]>('tracks', {
  get: external => external ?? localTracks.value,
  set: (value) => {
    localTracks.value = value;
    return value;
  },
});

const localClips = shallowRef<TimelineClip[]>(defaultClips ? defaultClips.slice() : []);
const clips = defineModel<TimelineClip[]>('clips', {
  get: external => external ?? localClips.value,
  set: (value) => {
    localClips.value = value;
    return value;
  },
});

const localMarkers = shallowRef<TimelineMarker[]>(defaultMarkers ? defaultMarkers.slice() : []);
const markers = defineModel<TimelineMarker[]>('markers', {
  get: external => external ?? localMarkers.value,
  set: (value) => {
    localMarkers.value = value;
    return value;
  },
});

const currentTime = defineModel<number>('currentTime', { default: undefined as unknown as number });
if (currentTime.value === undefined) currentTime.value = defaultCurrentTime ?? 0;

const offset = defineModel<number>('offset', { default: undefined as unknown as number });
if (offset.value === undefined) offset.value = defaultOffset ?? 0;

const pxPerSecond = defineModel<number>('pxPerSecond', {
  default: undefined as unknown as number,
  // Always present a clamped zoom so an out-of-range controlled value never
  // leaks into the scale geometry.
  get: external => clamp(external ?? defaultPxPerSecond ?? 100, minPxPerSecond, maxPxPerSecond),
});
if (pxPerSecond.value === undefined) pxPerSecond.value = defaultPxPerSecond ?? 100;

const selectedModel = defineModel<string[]>('selectedClipIds', {
  default: undefined as unknown as string[],
});
if (selectedModel.value === undefined) selectedModel.value = defaultSelectedClipIds ?? [];

// ── element measurement ──────────────────────────────────────────────────────
const rootEl = shallowRef<HTMLElement>();
const viewportEl = shallowRef<HTMLElement | null>(null);
// The tracks viewport reports its width; fall back to the root pre-mount.
const { width: rootWidth } = useElementSize(rootEl);
const { width: vpWidth } = useElementSize(viewportEl);
const viewportWidth = computed(() => vpWidth.value || rootWidth.value);

// ── derived state (immutable shallow Maps) ───────────────────────────────────
const trackLookup = shallowRef(new Map<string, TimelineTrack>());
const clipLookup = shallowRef(new Map<string, TimelineClip>());
const markerLookup = shallowRef(new Map<string, TimelineMarker>());
const selectedClipIds = shallowRef(new Set<string>(selectedModel.value ?? []));
const marquee = shallowRef<TimelineMarqueeRect | null>(null);

const isMutating = shallowRef(false);
const draggingClipId = shallowRef<string | null>(null);
// Ids touched by the in-flight gesture (committed on pointerup).
const dirtyClipIds = new Set<string>();

function reconcileTracks(): void {
  const arr = tracks.value ?? [];
  const map = trackLookup.value;
  const seen = new Set<string>();
  for (const t of arr) {
    seen.add(t.id);
    map.set(t.id, t);
  }
  for (const id of map.keys()) if (!seen.has(id)) map.delete(id);
  triggerRef(trackLookup);
}

function reconcileClips(): void {
  // During an active gesture the model array is stale on purpose; don't clobber
  // the live overlay positions until pointerup commits them.
  if (isMutating.value) return;
  const arr = clips.value ?? [];
  const map = clipLookup.value;
  const seen = new Set<string>();
  for (const c of arr) {
    seen.add(c.id);
    map.set(c.id, c);
  }
  for (const id of map.keys()) if (!seen.has(id)) map.delete(id);
  triggerRef(clipLookup);
}

function reconcileMarkers(): void {
  const arr = markers.value ?? [];
  const map = markerLookup.value;
  const seen = new Set<string>();
  for (const m of arr) {
    seen.add(m.id);
    map.set(m.id, m);
  }
  for (const id of map.keys()) if (!seen.has(id)) map.delete(id);
  triggerRef(markerLookup);
}

watch(tracks, reconcileTracks, { immediate: true });
watch(clips, reconcileClips, { immediate: true });
watch(markers, reconcileMarkers, { immediate: true });

// External selection writes sync the Set (skip during a gesture).
watch(selectedModel, (ids) => {
  if (isMutating.value) return;
  const next = ids ?? [];
  // Skip the rebuild when the incoming ids already match the live Set — this
  // watcher also fires on our own `commitSelection` write, and we don't want a
  // redundant Set allocation / downstream re-render on the round-trip.
  const cur = selectedClipIds.value;
  if (next.length === cur.size && next.every(id => cur.has(id))) return;
  selectedClipIds.value = new Set(next);
}, { deep: true });

// ── ordering (for roving focus + duration) ───────────────────────────────────
const trackIds = computed(() => (tracks.value ?? []).map(t => t.id));

const orderedClipIds = computed(() => {
  const arr = [...clipLookup.value.values()];
  arr.sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
  return arr.map(c => c.id);
});

const orderedMarkerIds = computed(() => {
  const arr = [...markerLookup.value.values()];
  arr.sort((a, b) => a.time - b.time || a.id.localeCompare(b.id));
  return arr.map(m => m.id);
});

// The single roving tab-stop: the first selected clip in time order, else the
// first clip. Computed once here (O(N)) so each `TimelineClip` does an O(1)
// equality check instead of scanning `orderedClipIds` itself (which was O(N) per
// clip → O(N^2) on every selection change).
const tabStopClipId = computed<string | undefined>(() => {
  const order = orderedClipIds.value;
  const sel = selectedClipIds.value;
  if (sel.size > 0) {
    for (const id of order) if (sel.has(id)) return id;
  }
  return order[0];
});

const duration = computed(() => {
  if (durationProp !== undefined && durationProp > 0) return durationProp;
  const fromClips = clipsDuration(clipLookup.value.values());
  // Keep markers/playhead within range too.
  let max = fromClips;
  for (const m of markerLookup.value.values()) if (m.time > max) max = m.time;
  if (currentTime.value > max) max = currentTime.value;
  return max;
});

// ── coordinate model (zoom = px-per-second; vertical lanes fixed) ────────────
const effectivePxPerSecond = computed(() => Math.max(pxPerSecond.value, 1e-6));
const visibleStart = computed(() => offset.value);
const visibleEnd = computed(() => offset.value + viewportWidth.value / effectivePxPerSecond.value);
const isRtl = computed(() => direction.value === 'rtl');

const { scale, invert: rawInvert } = useScale({
  domain: () => [visibleStart.value, visibleEnd.value] as const,
  range: () => [0, viewportWidth.value] as const,
  rtl: () => isRtl.value,
  tickKind: 'none',
});

// Guard projection until the viewport is measured: a zero-width viewport would
// invert every pixel to the same time. Return 0 (not NaN) pre-measure.
function invert(px: number): number {
  if (viewportWidth.value <= 0) return 0;
  return rawInvert(px);
}

const effectiveSnapStep = computed(() => {
  if (snapStep !== undefined && snapStep > 0) return snapStep;
  return fps > 0 ? 1 / fps : 1;
});

function snapFrame(seconds: number): number {
  return snapToFrame(seconds, fps);
}

function formatTimecode(seconds: number): string {
  return timeToTimecode(seconds, fps);
}

// ── shared snap engine ───────────────────────────────────────────────────────
// Targets are pre-projected to pixels via `scale`; rebuilt reactively. A dragged
// clip excludes its own ids at call time via `snapTime`.
//
// The pool is split into four independently-memoized parts so a clip-move drag
// frame (which only mutates `clipLookup`) does NOT rebuild the grid / marker /
// playhead targets. The grid in particular emits one object per snap step across
// the visible window (thousands at low zoom); rebuilding it every pointermove was
// pure churn since `offset`/`pxPerSecond`/window/step are constant during a drag.
const project = (v: number): number => scale(v);

// Clip edges (left/right/center) — carry the clip id so a clip can skip its own.
// Only this part re-runs per drag frame (and the dragged clip is excluded at
// call time, so the change is a same-size reshuffle).
const clipEdgeTargets = computed<SnapTarget[]>(() => {
  if (!snapping) return [];
  const rects = [...clipLookup.value.values()].map(c => ({
    left: c.start,
    right: c.start + c.duration,
    top: 0,
    bottom: 0,
    id: c.id,
  }));
  return edgeTargets(rects, 'x', project);
});

// Playhead — depends only on `currentTime` (+ scale).
const playheadTargets = computed<SnapTarget[]>(() => {
  if (!snapping) return [];
  return pointTargets([currentTime.value], 'playhead', 'x', project, ['__playhead__']);
});

// Markers — depend only on `markerLookup` (+ scale).
const markerPointTargets = computed<SnapTarget[]>(() => {
  if (!snapping) return [];
  const markerVals = [...markerLookup.value.values()];
  return pointTargets(
    markerVals.map(m => m.time),
    'marker',
    'x',
    project,
    markerVals.map(m => m.id),
  );
});

// Frame grid across the visible window — the expensive part (one entry per step).
// Depends only on the window + step (+ scale's window deps), none of which change
// while a clip is being moved, so it stays cached across the whole gesture.
const gridSnapTargets = computed<SnapTarget[]>(() => {
  if (!snapping) return [];
  return gridTargets(visibleStart.value, visibleEnd.value, effectiveSnapStep.value, project, 'x');
});

const snapTargets = computed<SnapTarget[]>(() => {
  if (!snapping) return [];
  // Concatenate the cached pools. During a drag only `clipEdgeTargets` is dirty,
  // so this is a reference copy — no per-target object allocation.
  return [
    ...clipEdgeTargets.value,
    ...playheadTargets.value,
    ...markerPointTargets.value,
    ...gridSnapTargets.value,
  ];
});

const snapEngine = useSnapping({
  // Snapping is also gated on a measured viewport: pre-measure, `scale` collapses
  // every value to px 0, so a snap would magnetise everything to one target.
  enabled: () => snapping && !disabled && viewportWidth.value > 0,
  thresholdPx: () => snapThresholdPx,
  axis: 'x',
  project: (value: number) => scale(value),
  targets: () => snapTargets.value,
  // Playhead out-pulls markers out-pull edges out-pull grid.
  priority: { order: ['playhead', 'marker', 'edge', 'center', 'grid'], relaxPx: 4 },
});

function snapTime(seconds: number, exclude?: string | Set<string>): number {
  if (!snapping || disabled || viewportWidth.value <= 0) return seconds;
  // The engine's `project` maps the candidate value into pixel space, measures
  // distance there, and returns the matched target's domain value (seconds).
  return snapEngine.snap1d(seconds, { exclude }).value;
}

// ── track mutation ────────────────────────────────────────────────────────────
function patchTrack(id: string, patch: Partial<TimelineTrack>): void {
  if (disabled) return;
  const track = trackLookup.value.get(id);
  if (!track) return;
  // Update the lookup immutably (new object so the per-track computed re-renders)
  // and write the public model.
  trackLookup.value.set(id, { ...track, ...patch });
  triggerRef(trackLookup);
  tracks.value = (tracks.value ?? []).map(t => (t.id === id ? { ...t, ...patch } : t));
  emit('tracksChange', [{ type: 'patch', id, patch }]);
}

// ── clip mutation ─────────────────────────────────────────────────────────────
function setClip(id: string, next: TimelineClip): void {
  // Replace with a NEW object so the per-clip computed sees a new identity.
  clipLookup.value.set(id, next);
  triggerRef(clipLookup);
}

function moveClip(id: string, start: number, trackId: string, mutating: boolean): void {
  if (disabled) return;
  const clip = clipLookup.value.get(id);
  if (!clip || clip.locked) return;
  isMutating.value = mutating;
  draggingClipId.value = mutating ? id : draggingClipId.value;
  const clamped = Math.max(0, start);
  setClip(id, { ...clip, start: clamped, trackId });
  dirtyClipIds.add(id);
}

function trimClip(id: string, start: number, dur: number, mutating: boolean): void {
  if (disabled) return;
  const clip = clipLookup.value.get(id);
  if (!clip || clip.locked) return;
  if (dur <= 0) return;
  isMutating.value = mutating;
  draggingClipId.value = mutating ? id : draggingClipId.value;
  setClip(id, { ...clip, start: Math.max(0, start), duration: dur });
  dirtyClipIds.add(id);
}

function commitMutation(): void {
  isMutating.value = false;
  draggingClipId.value = null;
  if (dirtyClipIds.size === 0) return;
  const ids = [...dirtyClipIds];
  dirtyClipIds.clear();

  const changes: TimelineClipChange[] = [];
  const patchById = new Map<string, TimelineClip>();
  for (const id of ids) {
    const clip = clipLookup.value.get(id);
    if (!clip) continue;
    patchById.set(id, clip);
    changes.push({ type: 'move', id, trackId: clip.trackId, start: clip.start });
  }
  // Write the model immutably (only touched clips get a new object).
  clips.value = (clips.value ?? []).map(c => patchById.get(c.id) ?? c);
  if (changes.length) emit('clipsChange', changes);
  emit('clipCommit', ids);
}

function addClip(clip: TimelineClip): void {
  if (disabled) return;
  clips.value = [...(clips.value ?? []), clip];
  emit('clipsChange', [{ type: 'add', clip }]);
}

function updateClip(id: string, patch: Partial<TimelineClip>): void {
  if (disabled) return;
  clips.value = (clips.value ?? []).map(c => (c.id === id ? { ...c, ...patch } : c));
  const clip = clipLookup.value.get(id);
  if (!clip) return;
  const next = { ...clip, ...patch };
  if (patch.start !== undefined || patch.duration !== undefined)
    emit('clipsChange', [{ type: 'trim', id, start: next.start, duration: next.duration }]);
  else if (patch.trackId !== undefined)
    emit('clipsChange', [{ type: 'move', id, trackId: next.trackId, start: next.start }]);
}

function removeClip(id: string): void {
  if (disabled) return;
  clips.value = (clips.value ?? []).filter(c => c.id !== id);
  if (selectedClipIds.value.has(id)) {
    const next = new Set(selectedClipIds.value);
    next.delete(id);
    commitSelection(next);
  }
  emit('clipsChange', [{ type: 'remove', id }]);
}

function splitClip(id: string, at: number): void {
  if (disabled) return;
  const clip = clipLookup.value.get(id);
  if (!clip) return;
  const leftDur = at - clip.start;
  const rightDur = clip.start + clip.duration - at;
  if (leftDur <= 0 || rightDur <= 0) return;
  const left: TimelineClip = { ...clip, id: `${clip.id}-a`, duration: leftDur };
  const right: TimelineClip = { ...clip, id: `${clip.id}-b`, start: at, duration: rightDur };
  clips.value = (clips.value ?? []).flatMap(c => (c.id === id ? [left, right] : [c]));
  emit('clipsChange', [{ type: 'split', id, at }]);
}

function nudgeSelected(deltaSeconds: number): void {
  if (disabled || selectedClipIds.value.size === 0) return;
  const ids = [...selectedClipIds.value];
  const changes: TimelineClipChange[] = [];
  const patchById = new Map<string, TimelineClip>();
  for (const id of ids) {
    const clip = clipLookup.value.get(id);
    if (!clip || clip.locked) continue;
    const start = Math.max(0, snapFrame(clip.start + deltaSeconds));
    const next = { ...clip, start };
    patchById.set(id, next);
    clipLookup.value.set(id, next);
    changes.push({ type: 'move', id, trackId: clip.trackId, start });
  }
  if (patchById.size === 0) return;
  triggerRef(clipLookup);
  clips.value = (clips.value ?? []).map(c => patchById.get(c.id) ?? c);
  emit('clipsChange', changes);
  emit('clipCommit', [...patchById.keys()]);
}

function moveSelectedToAdjacentTrack(dirSign: 1 | -1): void {
  if (disabled || selectedClipIds.value.size === 0) return;
  const order = trackIds.value;
  const changes: TimelineClipChange[] = [];
  const patchById = new Map<string, TimelineClip>();
  for (const id of selectedClipIds.value) {
    const clip = clipLookup.value.get(id);
    if (!clip || clip.locked) continue;
    const idx = order.indexOf(clip.trackId);
    const nextIdx = idx + dirSign;
    if (nextIdx < 0 || nextIdx >= order.length) continue;
    const trackId = order[nextIdx]!;
    const next = { ...clip, trackId };
    patchById.set(id, next);
    clipLookup.value.set(id, next);
    changes.push({ type: 'move', id, trackId, start: clip.start });
  }
  if (patchById.size === 0) return;
  triggerRef(clipLookup);
  clips.value = (clips.value ?? []).map(c => patchById.get(c.id) ?? c);
  emit('clipsChange', changes);
  emit('clipCommit', [...patchById.keys()]);
}

function removeSelected(): void {
  if (disabled || selectedClipIds.value.size === 0) return;
  const ids = selectedClipIds.value;
  const changes: TimelineClipChange[] = [...ids].map(id => ({ type: 'remove' as const, id }));
  clips.value = (clips.value ?? []).filter(c => !ids.has(c.id));
  commitSelection(new Set());
  emit('clipsChange', changes);
}

// ── playhead ──────────────────────────────────────────────────────────────────
function setCurrentTime(seconds: number, scrubbing = false): void {
  if (disabled) return;
  const clamped = clamp(seconds, 0, duration.value || Number.MAX_SAFE_INTEGER);
  if (scrubbing) isMutating.value = true;
  if (clamped !== currentTime.value) currentTime.value = clamped;
}

function commitScrub(): void {
  isMutating.value = false;
  emit('scrubCommit', currentTime.value);
}

// ── selection ──────────────────────────────────────────────────────────────────
function commitSelection(next: Set<string>): void {
  selectedClipIds.value = next;
  const ids = [...next];
  selectedModel.value = ids;
  emit('selectionChange', ids);
}

function selectClip(id: string, additive = false): void {
  if (disabled) return;
  const next = additive ? new Set(selectedClipIds.value) : new Set<string>();
  if (additive && next.has(id)) next.delete(id);
  else next.add(id);
  commitSelection(next);
}

function setSelection(ids: string[]): void {
  if (disabled) return;
  commitSelection(new Set(ids));
}

function clearSelection(): void {
  if (selectedClipIds.value.size === 0) return;
  commitSelection(new Set());
}

// ── roving-focus registry ──────────────────────────────────────────────────────
const clipEls = new Map<string, HTMLElement>();
const markerEls = new Map<string, HTMLElement>();
function registerClipEl(id: string, el: HTMLElement): void {
  clipEls.set(id, el);
}
function unregisterClipEl(id: string): void {
  clipEls.delete(id);
}
function registerMarkerEl(id: string, el: HTMLElement): void {
  markerEls.set(id, el);
}
function unregisterMarkerEl(id: string): void {
  markerEls.delete(id);
}

function focusAdjacentClip(fromId: string, dirSign: 1 | -1): void {
  const order = orderedClipIds.value;
  const idx = order.indexOf(fromId);
  if (idx === -1) return;
  const nextIdx = idx + dirSign;
  if (nextIdx < 0 || nextIdx >= order.length) return;
  clipEls.get(order[nextIdx]!)?.focus();
}

function focusClip(id: string): void {
  clipEls.get(id)?.focus();
}

// ── provide ────────────────────────────────────────────────────────────────────
const context: TimelineContext = {
  timelineId,
  offset: offset as Ref<number>,
  pxPerSecond: pxPerSecond as Ref<number>,
  duration,
  fps: toRef(() => fps),
  trackHeight: toRef(() => trackHeight),
  viewportWidth,
  scale,
  invert,
  snapToFrame: snapFrame,
  formatTimecode,
  snapping: toRef(() => snapping),
  disabled: toRef(() => disabled),
  direction,
  trackLookup,
  clipLookup,
  markerLookup,
  trackIds,
  orderedClipIds,
  orderedMarkerIds,
  tabStopClipId,
  selectedClipIds,
  currentTime: currentTime as Ref<number>,
  snapEngine,
  snapTime,
  isMutating,
  draggingClipId,
  patchTrack,
  addClip,
  updateClip,
  removeClip,
  splitClip,
  moveClip,
  trimClip,
  commitMutation,
  nudgeSelected,
  moveSelectedToAdjacentTrack,
  removeSelected,
  setCurrentTime,
  commitScrub,
  selectClip,
  setSelection,
  clearSelection,
  registerClipEl,
  unregisterClipEl,
  registerMarkerEl,
  unregisterMarkerEl,
  focusAdjacentClip,
  focusClip,
  viewportEl,
  marquee,
};
provideTimelineContext(context);

defineExpose({
  currentTime,
  offset,
  pxPerSecond,
  selectedClipIds,
  scale,
  invert,
  addClip,
  updateClip,
  removeClip,
  splitClip,
  selectClip,
  setSelection,
  clearSelection,
  removeSelected,
});

const { forwardRef } = useForwardExpose();

function setRootRef(el: unknown): void {
  forwardRef(el as never);
  rootEl.value = (el && typeof el === 'object' && '$el' in el ? (el as { $el: HTMLElement }).$el : el) as HTMLElement | undefined;
}
</script>

<template>
  <Primitive
    :ref="setRootRef"
    :as="as"
    role="group"
    aria-roledescription="timeline"
    :aria-disabled="disabled || undefined"
    :data-disabled="disabled ? '' : undefined"
    data-orientation="horizontal"
    :data-mutating="isMutating ? '' : undefined"
    :dir="direction"
  >
    <slot
      :scale="scale"
      :current-time="currentTime"
      :duration="duration"
      :px-per-second="pxPerSecond"
    />
  </Primitive>
</template>
