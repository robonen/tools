/**
 * Pad a non-negative integer to a fixed width with leading zeros.
 */
function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0');
}

/**
 * Convert a duration in seconds to a whole number of frames at `fps`.
 */
export function secondsToFrames(seconds: number, fps: number): number {
  return Math.round(seconds * fps);
}

/**
 * Convert a whole number of frames back to seconds at `fps`.
 */
export function framesToSeconds(frames: number, fps: number): number {
  return fps === 0 ? 0 : frames / fps;
}

/**
 * Format an integer frame count as an SMPTE timecode string.
 *
 * Returns `"HH:MM:SS:FF"` for non-drop-frame timecode and `"HH:MM:SS;FF"`
 * (semicolon separator) when `dropFrame` is `true`. Drop-frame uses the integer
 * standard algorithm: `dropFrames = round(fps * 0.066666)` (2 for ~30, 4 for
 * ~60), dropping that many frame numbers every minute except every 10th minute.
 * The `HH:MM:SS:FF` breakdown uses `timeBase = round(fps)`.
 *
 * @param frames Integer frame number (clamped at 0 for negative input).
 * @param fps Frame rate (e.g. `29.97`, `30`, `59.94`, `60`).
 * @param dropFrame Whether to apply drop-frame compensation. @default false
 */
export function framesToTimecode(frames: number, fps: number, dropFrame = false): string {
  let frameNumber = frames < 0 ? 0 : Math.round(frames);
  const timeBase = Math.round(fps);

  const sep = dropFrame ? ';' : ':';

  if (dropFrame && timeBase > 0) {
    const dropFrames = Math.round(fps * 0.066666);
    const framesPerMinute = timeBase * 60 - dropFrames;
    const framesPer10Minutes = timeBase * 600 - dropFrames * 9;

    const tenMinutes = Math.floor(frameNumber / framesPer10Minutes);
    let remainder = frameNumber % framesPer10Minutes;

    // The first minute of each 10-minute block has no dropped frames.
    if (remainder >= dropFrames) {
      remainder -= dropFrames;
      const minuteWithin = Math.floor(remainder / framesPerMinute);
      frameNumber += dropFrames * 9 * tenMinutes + dropFrames * minuteWithin;
    }
    else {
      frameNumber += dropFrames * 9 * tenMinutes;
    }
  }

  const ff = frameNumber % timeBase;
  const totalSeconds = Math.floor(frameNumber / timeBase);
  const ss = totalSeconds % 60;
  const mm = Math.floor(totalSeconds / 60) % 60;
  const hh = Math.floor(totalSeconds / 3600);

  return `${pad(hh)}:${pad(mm)}:${pad(ss)}${sep}${pad(ff)}`;
}

/**
 * Format a duration in seconds as an SMPTE timecode string at `fps`.
 *
 * Thin wrapper over {@link framesToTimecode}.
 *
 * @param dropFrame Whether to apply drop-frame compensation. @default false
 */
export function formatTimecode(seconds: number, fps: number, dropFrame = false): string {
  return framesToTimecode(secondsToFrames(seconds, fps), fps, dropFrame);
}

/**
 * Format a duration in seconds as a wall-clock string.
 *
 * Renders `"M:SS"` under an hour and `"H:MM:SS"` at or above an hour, with
 * zero-padded minutes/seconds.
 */
export function formatClock(seconds: number): string {
  const sign = seconds < 0 ? '-' : '';
  const total = Math.floor(Math.abs(seconds));
  const ss = total % 60;
  const mm = Math.floor(total / 60) % 60;
  const hh = Math.floor(total / 3600);

  if (hh > 0) return `${sign}${hh}:${pad(mm)}:${pad(ss)}`;
  return `${sign}${mm}:${pad(ss)}`;
}

/**
 * Format an integer frame count as a localized frame-number string.
 */
export function formatFrames(frames: number): string {
  return Math.round(frames).toLocaleString('en-US');
}
