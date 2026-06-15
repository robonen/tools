/**
 * The channels a histogram can describe. `'l'` is luminance (a single combined
 * channel), `'r'`/`'g'`/`'b'` are the colour primaries, and `'rgb'` is the
 * composite request that asks the display to render all three primaries
 * overlaid.
 */
export type HistogramChannel = 'l' | 'r' | 'g' | 'b' | 'rgb';

/** A single concrete channel whose bins can be drawn (excludes the `'rgb'` composite). */
export type HistogramBarChannel = 'l' | 'r' | 'g' | 'b';

/** How bin counts are mapped to bar heights. */
export type HistogramScaleType = 'linear' | 'log';

/**
 * Per-channel bin counts. Either a single `number[]` (interpreted as the channel
 * named by the root's `channel` prop) or an object carrying any subset of the
 * four concrete channels.
 */
export type HistogramData = number[] | Partial<Record<HistogramBarChannel, number[]>>;

/**
 * Default CSS colour stamped on `--histogram-color` for each channel so a
 * consumer can style bars purely from the data-attribute without re-deriving the
 * colour. These are plain hints; the consumer owns the final paint.
 */
export const HISTOGRAM_CHANNEL_COLORS: Record<HistogramBarChannel, string> = {
  l: '#888888',
  r: '#ff3b30',
  g: '#34c759',
  b: '#0a84ff',
};

/** Whether `data` is the single-array form (vs. the per-channel record). */
export function isSingleChannelData(data: HistogramData): data is number[] {
  return Array.isArray(data);
}

/**
 * Resolve the bin array for `channel` out of `data`. The single-array form maps
 * onto `fallbackChannel` (the root's `channel`); the record form is keyed
 * directly. Returns an empty array when the channel is absent — callers must
 * tolerate a zero-length result (an empty histogram is a valid state).
 */
export function getChannelBins(
  data: HistogramData,
  channel: HistogramBarChannel,
  fallbackChannel: HistogramBarChannel,
): number[] {
  if (isSingleChannelData(data)) {
    return channel === fallbackChannel ? data : [];
  }
  return data[channel] ?? [];
}

/**
 * The peak bin count across `bins`. `0` for an empty or all-zero array — the
 * caller uses this as the normalisation divisor and MUST guard against `0` so a
 * flat/empty histogram projects to zero height rather than `NaN`.
 *
 * Single pass, allocation-free.
 */
export function histogramMax(bins: number[]): number {
  let max = 0;
  for (let i = 0; i < bins.length; i++) {
    const v = bins[i]!;
    if (v > max) max = v;
  }
  return max;
}

/**
 * Project a raw bin `count` to a normalised bar height in `[0, 1]` against the
 * histogram peak `max`, under the chosen `scaleType`.
 *
 * The all-zero guard is load-bearing: when `max <= 0` every bar is `0` (no
 * divide-by-zero, no `NaN`). `log` uses `log1p` so an empty bin maps to `0` and
 * the peak maps to `1`, compressing tall spikes the way an image histogram's
 * log view does.
 */
export function projectBarHeight(count: number, max: number, scaleType: HistogramScaleType): number {
  if (max <= 0) return 0;
  if (count <= 0) return 0;
  if (scaleType === 'log') {
    // log1p(count)/log1p(max): 0→0, max→1, monotonic in between.
    return Math.log1p(count) / Math.log1p(max);
  }
  const h = count / max;
  return h > 1 ? 1 : h;
}

/**
 * Map a channel's bins to normalised heights `[0, 1]` for rendering. Returns a
 * fresh packed array; an empty/all-zero input yields all-zero heights (no
 * `NaN`). The peak may be supplied (e.g. a shared peak across channels) or
 * derived from `bins`.
 */
export function projectBars(
  bins: number[],
  scaleType: HistogramScaleType,
  max = histogramMax(bins),
): number[] {
  // Grow from empty with `push` so the array stays in V8's packed numeric
  // elements-kind. Pre-sizing via `Array.from({ length })` would seed it with
  // `undefined` (a tagged hole), defeating the PACKED_DOUBLE fast path.
  const out: number[] = [];
  for (let i = 0; i < bins.length; i++) {
    out.push(projectBarHeight(bins[i]!, max, scaleType));
  }
  return out;
}
