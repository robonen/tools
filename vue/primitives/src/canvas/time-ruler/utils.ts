import type { TickKind } from '../../internal/scale';
import { formatClock, formatFrames, formatTimecode, secondsToFrames } from '../../internal/scale';
import type { TimeRulerMode } from './context';

/**
 * Map a {@link TimeRulerMode} to the {@link TickKind} its `useScale` should use.
 *
 * The ruler's scale domain is always in SECONDS, so both frame-based modes route
 * through the `'timecode'` ticker — which converts the seconds domain to an
 * integer-frame ladder internally (positions never drift) while keeping
 * `domain` / `range` in seconds. A `format` override (see {@link tickFormatFor})
 * then chooses between SMPTE timecode and bare frame numbers.
 *
 * - `'seconds'`  → `'time'`     (human time ladder, `M:SS` / `H:MM:SS` labels)
 * - `'timecode'` → `'timecode'` (SMPTE `HH:MM:SS:FF` labels)
 * - `'frames'`   → `'timecode'` (frame-aligned ticks, frame-number labels)
 */
export function modeToTickKind(mode: TimeRulerMode): TickKind {
  switch (mode) {
    case 'timecode':
    case 'frames':
      return 'timecode';
    case 'seconds':
    default:
      return 'time';
  }
}

/**
 * A `format` callback (seconds → label) for the active `mode`, or `undefined`
 * to let the ticker apply its default. Only `'frames'` needs an override (it
 * borrows the timecode ticker's frame-aligned geometry but labels as frame
 * numbers); `'seconds'` and `'timecode'` use their generators' defaults.
 */
export function tickFormatFor(
  mode: TimeRulerMode,
  fps: number,
): ((seconds: number) => string) | undefined {
  if (mode !== 'frames') return undefined;
  return (seconds: number) => formatFrames(secondsToFrames(seconds, fps));
}

/**
 * Format a time (in seconds) for display per the active {@link TimeRulerMode}.
 *
 * - `'seconds'`  → wall-clock string via {@link formatClock}
 * - `'timecode'` → SMPTE timecode via {@link formatTimecode} (drop-frame aware)
 * - `'frames'`   → integer frame number via {@link formatFrames}
 */
export function formatTimeForMode(
  seconds: number,
  mode: TimeRulerMode,
  fps: number,
  dropFrame = false,
): string {
  switch (mode) {
    case 'timecode':
      return formatTimecode(seconds, fps, dropFrame);
    case 'frames':
      return formatFrames(secondsToFrames(seconds, fps));
    case 'seconds':
    default:
      return formatClock(seconds);
  }
}
