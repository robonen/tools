import { bench, describe } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { buildSmoothPath } from '../../../internal/spline';
import { buildBars, buildPathPoints, countBars, resamplePeaks } from '../utils';
import { WaveformBars, WaveformPath, WaveformRoot } from '../index';

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic fixtures (NO Math.random, NO network — seeded by index/formula).
// Peaks model a signed `-1..1` PCM-style envelope: a decaying sinusoid summed
// with a faster ripple, so resampling has real transients to pick a max from.
// ─────────────────────────────────────────────────────────────────────────────

function makePeaks(n: number): number[] {
  const out = Array.from<number>({ length: n });
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const envelope = 1 - 0.6 * t; // slow decay over the track
    const carrier = Math.sin(t * Math.PI * 64); // audible-rate oscillation
    const ripple = 0.35 * Math.sin(t * Math.PI * 503); // transient detail
    out[i] = envelope * (carrier * 0.7 + ripple); // stays within -1..1
  }
  return out;
}

// A Float32Array variant exercises the `ArrayLike<number>` fast path the root
// passes through from a `Float32Array` peaks prop (typed-array element reads).
function makePeaksF32(n: number): Float32Array {
  const src = makePeaks(n);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = src[i]!;
  return out;
}

const PEAKS_100 = makePeaks(100);
const PEAKS_1000 = makePeaks(1000);
const PEAKS_10000 = makePeaks(10000);
const PEAKS_F32_10000 = makePeaksF32(10000);

// Realistic body widths: a small inline waveform (~150 bars) and a full-bleed
// editor lane (~600+ bars) at the demo's barWidth=2 / barGap=1 (pitch 3).
const BAR_WIDTH = 2;
const BAR_GAP = 1;
const WIDTH_SMALL = 300; // → 100 bars
const WIDTH_LARGE = 1800; // → 600 bars

const SIGNED = true; // peaksRange '-1..1' (the root default → rectify by abs)

// Pre-built point sets for the smoothing benches (path mode silhouette).
const PATH_POINTS_256 = buildPathPoints(PEAKS_1000, WIDTH_LARGE, 120, 256, SIGNED);
const PATH_POINTS_1024 = buildPathPoints(PEAKS_10000, WIDTH_LARGE, 120, 1024, SIGNED);

// ─────────────────────────────────────────────────────────────────────────────
// countBars — cheap per-render geometry guard (runs on every width change).
// ─────────────────────────────────────────────────────────────────────────────

describe('countBars', () => {
  bench('small body (300px)', () => {
    countBars(WIDTH_SMALL, BAR_WIDTH, BAR_GAP);
  });

  bench('large body (1800px)', () => {
    countBars(WIDTH_LARGE, BAR_WIDTH, BAR_GAP);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// resamplePeaks — THE hot inner loop (max-magnitude reduction per bucket).
// Scales with BOTH source length and bucket count; benched across realistic and
// stress combinations.
// ─────────────────────────────────────────────────────────────────────────────

describe('resamplePeaks — by source length (100 buckets)', () => {
  bench('100 peaks', () => {
    resamplePeaks(PEAKS_100, 100, SIGNED);
  });

  bench('1000 peaks', () => {
    resamplePeaks(PEAKS_1000, 100, SIGNED);
  });

  bench('10000 peaks', () => {
    resamplePeaks(PEAKS_10000, 100, SIGNED);
  });

  bench('10000 peaks (Float32Array)', () => {
    resamplePeaks(PEAKS_F32_10000, 100, SIGNED);
  });
});

describe('resamplePeaks — by bucket count (10000 peaks)', () => {
  bench('100 buckets', () => {
    resamplePeaks(PEAKS_10000, 100, SIGNED);
  });

  bench('600 buckets', () => {
    resamplePeaks(PEAKS_10000, 600, SIGNED);
  });

  bench('upsample → 2000 buckets', () => {
    resamplePeaks(PEAKS_10000, 2000, SIGNED);
  });
});

describe('resamplePeaks — windowed slice (zoom/scroll)', () => {
  // The root maps the visible time window onto a peaks index slice; a zoomed-in
  // view resamples a sub-range into the same bucket count.
  bench('full window — 600 buckets over 10000', () => {
    resamplePeaks(PEAKS_10000, 600, SIGNED, 0, PEAKS_10000.length);
  });

  bench('25% zoom window — 600 buckets over slice', () => {
    resamplePeaks(PEAKS_10000, 600, SIGNED, 2500, 5000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildBars — bars-mode render hot path (countBars + resample + layout loop).
// This is what `WaveformRoot.buckets` computes on every width / peaks / window
// change. Benched at realistic (100 bars) and stress (600 bars) scale.
// ─────────────────────────────────────────────────────────────────────────────

describe('buildBars — bars-mode geometry', () => {
  bench('100 bars from 1000 peaks', () => {
    buildBars(PEAKS_1000, WIDTH_SMALL, BAR_WIDTH, BAR_GAP, SIGNED);
  });

  bench('600 bars from 10000 peaks', () => {
    buildBars(PEAKS_10000, WIDTH_LARGE, BAR_WIDTH, BAR_GAP, SIGNED);
  });

  bench('600 bars from 10000 peaks (Float32Array)', () => {
    buildBars(PEAKS_F32_10000, WIDTH_LARGE, BAR_WIDTH, BAR_GAP, SIGNED);
  });
});

describe('buildBars — sliding window (simulated scrub/zoom recompute)', () => {
  // Each iteration recomputes the full bar geometry over a window shifted by a
  // deterministic step — the per-frame cost when a user scrubs a zoomed lane.
  let frame = 0;
  const total = PEAKS_10000.length;
  const span = Math.floor(total / 4); // a 25% zoom window

  bench('600 bars, window slides per iteration', () => {
    const start = (frame * 137) % (total - span); // deterministic, no PRNG
    frame += 1;
    buildBars(PEAKS_10000, WIDTH_LARGE, BAR_WIDTH, BAR_GAP, SIGNED, start, start + span);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildPathPoints — path-mode polyline hot path (resample + y-projection loop).
// ─────────────────────────────────────────────────────────────────────────────

describe('buildPathPoints — path-mode silhouette', () => {
  bench('256 samples from 1000 peaks', () => {
    buildPathPoints(PEAKS_1000, WIDTH_LARGE, 120, 256, SIGNED);
  });

  bench('1024 samples from 10000 peaks', () => {
    buildPathPoints(PEAKS_10000, WIDTH_LARGE, 120, 1024, SIGNED);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildSmoothPath — Catmull-Rom smoothing over the path points (the d-string
// `WaveformPath` recomputes on every width/peaks/window change in path mode).
// ─────────────────────────────────────────────────────────────────────────────

describe('buildSmoothPath — Catmull-Rom path string', () => {
  bench('256 points, tension 0', () => {
    buildSmoothPath(PATH_POINTS_256, 0);
  });

  bench('256 points, tension 0.5', () => {
    buildSmoothPath(PATH_POINTS_256, 0.5);
  });

  bench('1024 points, tension 0', () => {
    buildSmoothPath(PATH_POINTS_1024, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Component mount + update via @vue/test-utils mount().
// `WaveformRoot` measures its own width (useElementSize → 0 synchronously under
// the bench), so to render a deterministic N bars we drive `WaveformBars`'
// default slot directly with pre-built geometry. This isolates the Vue render
// cost of N bar nodes (the real per-frame DOM work) from ResizeObserver timing.
// ─────────────────────────────────────────────────────────────────────────────

const BARS_50 = buildBars(PEAKS_1000, 150, BAR_WIDTH, BAR_GAP, SIGNED); // 50 bars
const BARS_500 = buildBars(PEAKS_10000, 1500, BAR_WIDTH, BAR_GAP, SIGNED); // 500 bars

function mountWaveform(peaks: number[], duration: number) {
  return mount(
    defineComponent({
      props: {
        peaks: { type: Array as () => number[], required: true },
        duration: { type: Number, required: true },
        currentTime: { type: Number, default: 0 },
      },
      setup(props) {
        return () =>
          h(
            WaveformRoot,
            {
              peaks: props.peaks,
              peaksRange: '-1..1',
              duration: props.duration,
              currentTime: props.currentTime,
              barWidth: BAR_WIDTH,
              barGap: BAR_GAP,
            },
            { default: () => h(WaveformBars) },
          );
      },
    }),
    { props: { peaks, duration: 100, currentTime: 0 } },
  );
}

describe('WaveformRoot + WaveformBars — mount', () => {
  bench('mount with ~50-bar fixture', () => {
    const w = mountWaveform(PEAKS_1000, 100);
    w.unmount();
  });

  bench('mount with ~500-bar fixture', () => {
    const w = mountWaveform(PEAKS_10000, 100);
    w.unmount();
  });
});

describe('WaveformRoot — update after prop change', () => {
  bench('currentTime change → patch', async () => {
    const w = mountWaveform(PEAKS_1000, 100);
    await w.setProps({ currentTime: 42 });
    await nextTick();
    w.unmount();
  });

  bench('peaks swap → re-resample + patch', async () => {
    const w = mountWaveform(PEAKS_1000, 100);
    await w.setProps({ peaks: PEAKS_10000 });
    await nextTick();
    w.unmount();
  });
});

// Path-mode component render: mount the SVG silhouette part (its `d` recompute
// drives buildPathPoints + buildSmoothPath).
describe('WaveformRoot + WaveformPath — mount', () => {
  function mountPath(peaks: number[], samples: number) {
    return mount(
      defineComponent({
        setup() {
          return () =>
            h(
              WaveformRoot,
              { peaks, peaksRange: '-1..1', duration: 100, mode: 'path' },
              { default: () => h(WaveformPath, { samples }) },
            );
        },
      }),
    );
  }

  bench('path mode, 256 samples', () => {
    const w = mountPath(PEAKS_1000, 256);
    w.unmount();
  });

  bench('path mode, 1024 samples', () => {
    const w = mountPath(PEAKS_10000, 1024);
    w.unmount();
  });
});

// Silence "fixture is unused" tree-shake concerns: reference the prebuilt arrays
// so the bench harness retains them deterministically across runs.
void BARS_50.length;
void BARS_500.length;
