import { framesToSeconds, framesToTimecode, secondsToFrames } from '../../internal/scale';

/**
 * A track lane in the timeline. Tracks stack vertically; their height is fixed
 * (NOT affected by horizontal zoom) and read from `height` (falling back to the
 * Root's `trackHeight`).
 */
export interface TimelineTrack {
  /** Stable identity. */
  id: string;
  /** Human label rendered in the gutter. */
  label?: string;
  /** Lane height in pixels (overrides the Root default). */
  height?: number;
  /** Muted state (audio off). */
  muted?: boolean;
  /** Locked state (clips not editable). */
  locked?: boolean;
  /** Soloed state. */
  soloed?: boolean;
  /** Hidden lane (not rendered). */
  hidden?: boolean;
  /** Free-form kind tag (`'video'` / `'audio'` / …). */
  kind?: string;
}

/**
 * A clip on a track. `start` / `duration` are in SECONDS (the timeline's domain
 * unit); pixel geometry is derived via the Root's scale (`pxPerSecond`).
 */
export interface TimelineClip<Data = unknown> {
  /** Stable identity. */
  id: string;
  /** Owning track id. */
  trackId: string;
  /** Start time in seconds. */
  start: number;
  /** Duration in seconds (always `> 0`). */
  duration: number;
  /** Human label. */
  label?: string;
  /** Display color token. */
  color?: string;
  /** Locked clip (not draggable / trimmable). */
  locked?: boolean;
  /** Consumer payload. */
  data?: Data;
}

/**
 * A marker pinned to a time on the timeline (chapter / cue point).
 */
export interface TimelineMarker {
  /** Stable identity. */
  id: string;
  /** Time in seconds. */
  time: number;
  /** Human label. */
  label?: string;
  /** Display color token. */
  color?: string;
}

/**
 * Convert a time in seconds to its SMPTE timecode string at `fps`. Thin wrapper
 * routed through the shared `scale` timecode helpers so the timeline and ruler
 * format identically.
 */
export function timeToTimecode(seconds: number, fps: number, dropFrame = false): string {
  return framesToTimecode(secondsToFrames(seconds, fps), fps, dropFrame);
}

/**
 * Snap a time (seconds) to the nearest whole frame at `fps`. Used as the keyboard
 * nudge granularity and the default snap grid.
 */
export function snapToFrame(seconds: number, fps: number): number {
  if (fps <= 0) return seconds;
  return framesToSeconds(secondsToFrames(seconds, fps), fps);
}

/**
 * Auto-derive the content duration from a set of clips: the largest
 * `start + duration`. Returns `0` for an empty set.
 */
export function clipsDuration(clips: Iterable<TimelineClip>): number {
  let max = 0;
  for (const c of clips) {
    const end = c.start + c.duration;
    if (end > max) max = end;
  }
  return max;
}

/**
 * Test whether a clip's time span `[start, start+duration]` intersects a
 * time window `[from, to]` (half-open-tolerant; touching edges count as an
 * intersection so a zero-width marquee on an edge still selects).
 */
export function clipIntersectsTime(clip: TimelineClip, from: number, to: number): boolean {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  return clip.start <= hi && clip.start + clip.duration >= lo;
}
