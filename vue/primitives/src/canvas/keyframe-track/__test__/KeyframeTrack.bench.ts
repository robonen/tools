import { bench, describe } from 'vitest';
import { defineComponent, h, nextTick, render } from 'vue';
import { solveBezierX } from '../../../internal/spline';
import {
  KeyframeTrackKeyframe,
  KeyframeTrackRoot,
  KeyframeTrackSegment,
  clampKeyframeTime,
  defaultKeyframeValueText,
  sampleKeyframes,
  snapTimeToFrame,
  sortKeyframes,
} from '../index';
import type { KeyframeTrackKeyframeData } from '../index';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures — deterministic, built once at module scope (NO Math.random).
//
// `time` ramps monotonically (already sorted ascending) so the realistic scales
// hit the binary-search / neighbour-clamp paths the way the live sampler does;
// `value` and `easing` are seeded by index so the spline solve takes a non-trivial
// (non-identity) curve roughly half the time.
// ─────────────────────────────────────────────────────────────────────────────

const EASINGS: Array<[number, number, number, number]> = [
  [0, 0, 1, 1], // linear (identity fast-path in solveBezierX)
  [0, 0, 0.2, 1], // ease-out
  [0.5, 0, 1, 1], // ease-in
  [0.65, 0, 0.35, 1], // ease-in-out
];

/** Build `n` sorted keyframes spanning [0, n/10] seconds with cycling easings. */
function makeKeyframes(n: number): KeyframeTrackKeyframeData[] {
  const out: KeyframeTrackKeyframeData[] = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = {
      id: `k${i}`,
      time: i / 10, // 0.1s apart → strictly ascending, already sorted
      value: (i % 11) / 10, // 0.0 .. 1.0, deterministic sawtooth
      // Every 4th keyframe is un-eased (undefined → DEFAULT_KEYFRAME_EASING);
      // the rest cycle through real curves to exercise the Newton-Raphson solve.
      easing: i % 4 === 0 ? undefined : EASINGS[i % EASINGS.length],
    };
  }
  return out;
}

/** Build `n` keyframes in REVERSE time order to force a real sort (worst case for sortKeyframes). */
function makeUnsortedKeyframes(n: number): KeyframeTrackKeyframeData[] {
  const out: KeyframeTrackKeyframeData[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const j = n - 1 - i;
    out[i] = { id: `k${j}`, time: j / 10, value: (j % 11) / 10 };
  }
  return out;
}

const KF_100 = makeKeyframes(100);
const KF_1000 = makeKeyframes(1000);

const KF_100_UNSORTED = makeUnsortedKeyframes(100);
const KF_1000_UNSORTED = makeUnsortedKeyframes(1000);

const VALUE_RANGE: readonly [number, number] = [0, 1];
const FPS = 30;

// Pre-computed sample times spanning the full keyframe range, so each pass over
// a curve exercises the bracketing binary search end-to-end (the readout in the
// demo samples ~120 points per animation frame). Seeded by index, not random.
function makeSampleTimes(count: number, span: number): number[] {
  const out: number[] = new Array(count);
  for (let i = 0; i < count; i++) out[i] = (i / (count - 1)) * span;
  return out;
}

const SAMPLE_TIMES_120 = makeSampleTimes(120, 10); // one demo curve frame over the 100-kf range
const SAMPLE_TIMES_120_WIDE = makeSampleTimes(120, 100); // same frame over the 1000-kf range

// Easing-solver probes in [0,1] (the curve-preview polyline samples ~33 points).
const BEZIER_X_64 = makeSampleTimes(64, 1);

// Simulated pointermove deltas (px-equivalent seconds) for the drag hot path —
// a deterministic back-and-forth sweep, no random jitter.
const MOVE_TIMES_100 = (() => {
  const out: number[] = Array.from({ length: 100 });
  for (let i = 0; i < 100; i++) out[i] = 5 + Math.sin(i / 8) * 4; // ∈ ~[1, 9]
  return out;
})();

// ─────────────────────────────────────────────────────────────────────────────
// Pure hot-path maths — these run on the live render / pointer paths.
// ─────────────────────────────────────────────────────────────────────────────

describe('sampleKeyframes — single sample by curve size', () => {
  bench('100 keyframes — sample mid-range', () => {
    sampleKeyframes(KF_100, 5, VALUE_RANGE);
  });

  bench('1000 keyframes — sample mid-range', () => {
    sampleKeyframes(KF_1000, 50, VALUE_RANGE);
  });
});

describe('sampleKeyframes — full curve sweep (per-frame readout)', () => {
  bench('100 keyframes × 120 samples', () => {
    let acc = 0;
    for (let i = 0; i < SAMPLE_TIMES_120.length; i++)
      acc += sampleKeyframes(KF_100, SAMPLE_TIMES_120[i]!, VALUE_RANGE);
    return acc;
  });

  bench('1000 keyframes × 120 samples', () => {
    let acc = 0;
    for (let i = 0; i < SAMPLE_TIMES_120_WIDE.length; i++)
      acc += sampleKeyframes(KF_1000, SAMPLE_TIMES_120_WIDE[i]!, VALUE_RANGE);
    return acc;
  });
});

describe('solveBezierX — easing solve', () => {
  bench('identity (linear) × 64', () => {
    let acc = 0;
    for (let i = 0; i < BEZIER_X_64.length; i++)
      acc += solveBezierX(0, 0, 1, 1, BEZIER_X_64[i]!);
    return acc;
  });

  bench('ease-in-out (Newton-Raphson) × 64', () => {
    let acc = 0;
    for (let i = 0; i < BEZIER_X_64.length; i++)
      acc += solveBezierX(0.65, 0, 0.35, 1, BEZIER_X_64[i]!);
    return acc;
  });
});

describe('sortKeyframes — reconcile / commit', () => {
  bench('100 keyframes (reverse-sorted input)', () => {
    sortKeyframes(KF_100_UNSORTED);
  });

  bench('1000 keyframes (reverse-sorted input)', () => {
    sortKeyframes(KF_1000_UNSORTED);
  });
});

describe('clampKeyframeTime — neighbour clamp (pointer drag)', () => {
  const opts = { allowOverlap: false, minTimeBetween: 1 / FPS, duration: 100 };

  bench('100 keyframes × 100 moves', () => {
    let acc = 0;
    for (let i = 0; i < MOVE_TIMES_100.length; i++) {
      const index = (i * 7) % KF_100.length; // deterministic spread of touched indices
      acc += clampKeyframeTime(KF_100, index, MOVE_TIMES_100[i]!, opts);
    }
    return acc;
  });

  bench('1000 keyframes × 100 moves', () => {
    let acc = 0;
    for (let i = 0; i < MOVE_TIMES_100.length; i++) {
      const index = (i * 71) % KF_1000.length;
      acc += clampKeyframeTime(KF_1000, index, MOVE_TIMES_100[i]!, opts);
    }
    return acc;
  });
});

describe('snapTimeToFrame — frame-grid quantize', () => {
  bench('100 quantize ops @30fps', () => {
    let acc = 0;
    for (let i = 0; i < MOVE_TIMES_100.length; i++)
      acc += snapTimeToFrame(MOVE_TIMES_100[i]!, FPS);
    return acc;
  });
});

describe('defaultKeyframeValueText — aria-valuetext', () => {
  bench('100 value-text formats (with property)', () => {
    for (let i = 0; i < MOVE_TIMES_100.length; i++)
      defaultKeyframeValueText(MOVE_TIMES_100[i]! / 10, 'opacity');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Component mount + update via Vue render() — realistic (50) and stress (500).
//
// Each keyframe renders a `role="slider"` Primitive that reads the projection /
// sampler from context, plus a segment band between neighbours. We mount the full
// tree, flush a tick, then update a prop (duration) to time the reconcile +
// re-projection cost, and finally unmount.
// ─────────────────────────────────────────────────────────────────────────────

function makeHarness(initial: KeyframeTrackKeyframeData[]) {
  return defineComponent({
    props: {
      keyframes: { type: Array as () => KeyframeTrackKeyframeData[], default: () => initial },
      duration: { type: Number, default: 50 },
    },
    setup(props) {
      return () =>
        h(
          KeyframeTrackRoot as any,
          {
            modelValue: props.keyframes,
            property: 'opacity',
            duration: props.duration,
            fps: FPS,
            valueRange: [0, 1],
            // The Root measures its own box; give it a concrete lane so the
            // projection / snap targets are non-degenerate during the bench.
            style: 'width: 600px; height: 160px; position: relative; display: block;',
          },
          {
            default: ({ keyframes }: { keyframes: KeyframeTrackKeyframeData[] }) => [
              ...keyframes
                .slice(0, -1)
                .map(k =>
                  h(KeyframeTrackSegment, { key: `seg-${k.id}`, keyframeId: k.id }),
                ),
              ...keyframes.map(k =>
                h(KeyframeTrackKeyframe, { key: k.id, keyframeId: k.id, id: `kf-${k.id}` }),
              ),
            ],
          },
        );
    },
  });
}

const KF_50 = makeKeyframes(50);
const KF_500 = makeKeyframes(500);

const Harness50 = makeHarness(KF_50);
const Harness500 = makeHarness(KF_500);

describe('KeyframeTrackRoot — mount + unmount', () => {
  bench('mount 50 keyframes', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    render(h(Harness50), container);
    await nextTick();
    render(null, container);
    container.remove();
  });

  bench('mount 500 keyframes', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    render(h(Harness500), container);
    await nextTick();
    render(null, container);
    container.remove();
  });
});

describe('KeyframeTrackRoot — re-render after prop change', () => {
  bench('50 keyframes — duration change + flush', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    render(h(Harness50, { duration: 50 }), container);
    await nextTick();
    // Prop change re-runs the time scale + every keyframe/segment projection.
    render(h(Harness50, { duration: 80 }), container);
    await nextTick();
    render(null, container);
    container.remove();
  });

  bench('500 keyframes — duration change + flush', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    render(h(Harness500, { duration: 50 }), container);
    await nextTick();
    render(h(Harness500, { duration: 80 }), container);
    await nextTick();
    render(null, container);
    container.remove();
  });
});
