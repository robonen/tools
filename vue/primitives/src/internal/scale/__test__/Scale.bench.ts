import { bench, describe } from 'vitest';
import { ref } from 'vue';
import {
  formatClock,
  formatFrames,
  formatTimecode,
  frameTicks,
  framesToTimecode,
  getClosestValueIndex,
  getStepDecimals,
  hasMinStepsBetweenSortedValues,
  niceNum,
  niceTicks,
  roundToStep,
  scaleLinear,
  secondsToFrames,
  timeTicks,
  timecodeTicks,
  useScale,
} from '..';

// ---------------------------------------------------------------------------
// Deterministic fixtures (NO Math.random — every value seeded by index/formula)
// ---------------------------------------------------------------------------

/** Pointer x-positions sweeping a 1000px range, 100 / 1000 samples. */
function buildPointerPx(n: number, span: number): number[] {
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) out[i] = (i / (n - 1)) * span;
  return out;
}

/** Raw domain values (e.g. unsnapped seconds) sweeping a domain, 100 / 1000. */
function buildDomainValues(n: number, lo: number, hi: number): number[] {
  const out = new Array<number>(n);
  const span = hi - lo;
  for (let i = 0; i < n; i++) {
    // A deterministic non-linear sweep so snapping rounds in both directions.
    const t = i / (n - 1);
    out[i] = lo + span * (t * t * 0.5 + t * 0.5);
  }
  return out;
}

/** Sorted, evenly-spaced thumb values for the multi-thumb invariant checks. */
function buildSortedValues(n: number, lo: number, hi: number): number[] {
  const out = new Array<number>(n);
  const step = (hi - lo) / (n - 1);
  for (let i = 0; i < n; i++) out[i] = lo + i * step;
  return out;
}

const POINTER_100 = buildPointerPx(100, 1000);
const POINTER_1000 = buildPointerPx(1000, 1000);

const VALUES_100 = buildDomainValues(100, 0, 600);
const VALUES_1000 = buildDomainValues(1000, 0, 600);

const SORTED_100 = buildSortedValues(100, 0, 1000);
const SORTED_1000 = buildSortedValues(1000, 0, 1000);

// Frame numbers for timecode formatting (29.97 drop-frame is the costly path).
const FRAMES_100 = (() => {
  const out = Array.from({ length: 100 });
  for (let i = 0; i < 100; i++) out[i] = i * 1800; // ~1 min apart at 30fps
  return out;
})();
const FRAMES_1000 = (() => {
  const out = Array.from({ length: 1000 });
  for (let i = 0; i < 1000; i++) out[i] = i * 180;
  return out;
})();

// Realistic ruler geometry: 600s timeline at ~1.6px/s over a ~1000px viewport.
const REALISTIC = {
  domain: [0, 600] as const,
  range: [0, 1000] as const,
};
// Stress geometry: a 10-hour axis at high pixel density (deep tick generation).
const STRESS = {
  domain: [0, 36_000] as const,
  range: [0, 20_000] as const,
};

const STEP = 0.1;
const STEP_DECIMALS = getStepDecimals(STEP);

// ===========================================================================
// 1. Pure projection math — the pointermove hot path (scaleLinear / snapping)
// ===========================================================================

describe('math: scaleLinear (pointer projection)', () => {
  bench('scaleLinear ×100', () => {
    for (let i = 0; i < POINTER_100.length; i++) {
      scaleLinear(POINTER_100[i]!, 0, 1000, 0, 600);
    }
  });

  bench('scaleLinear ×1000', () => {
    for (let i = 0; i < POINTER_1000.length; i++) {
      scaleLinear(POINTER_1000[i]!, 0, 1000, 0, 600);
    }
  });
});

describe('math: roundToStep (snap-to-step hot path)', () => {
  bench('roundToStep ×100', () => {
    for (let i = 0; i < VALUES_100.length; i++) {
      roundToStep(VALUES_100[i]!, STEP, 0, STEP_DECIMALS);
    }
  });

  bench('roundToStep ×1000', () => {
    for (let i = 0; i < VALUES_1000.length; i++) {
      roundToStep(VALUES_1000[i]!, STEP, 0, STEP_DECIMALS);
    }
  });
});

describe('math: getStepDecimals (per-step cache miss)', () => {
  // Vary the step so String() / indexOf actually run each call.
  bench('getStepDecimals ×1000 (varied step)', () => {
    for (let i = 0; i < 1000; i++) {
      getStepDecimals(1 / 10 ** (i % 6));
    }
  });
});

describe('math: getClosestValueIndex (nearest-thumb pick)', () => {
  bench('100 thumbs ×100 picks', () => {
    for (let i = 0; i < POINTER_100.length; i++) {
      getClosestValueIndex(SORTED_100, POINTER_100[i]!);
    }
  });

  bench('1000 thumbs ×100 picks', () => {
    for (let i = 0; i < POINTER_100.length; i++) {
      getClosestValueIndex(SORTED_1000, POINTER_100[i]!);
    }
  });
});

describe('math: hasMinStepsBetweenSortedValues (drag invariant)', () => {
  bench('100 values', () => {
    hasMinStepsBetweenSortedValues(SORTED_100, 1, 1);
  });

  bench('1000 values', () => {
    hasMinStepsBetweenSortedValues(SORTED_1000, 1, 1);
  });
});

describe('math: niceNum (tick rounding primitive)', () => {
  bench('niceNum ×1000 (varied magnitude)', () => {
    for (let i = 0; i < 1000; i++) {
      // Sweep magnitudes 1e-2 … 1e4 deterministically.
      niceNum((1 + (i % 9)) * 10 ** ((i % 7) - 2), i % 2 === 0);
    }
  });
});

// ===========================================================================
// 2. Tick generators — the most expensive recompute per geometry change
// ===========================================================================

describe('ticks: niceTicks (realistic vs stress)', () => {
  bench('realistic (600s axis)', () => {
    niceTicks({ domain: REALISTIC.domain, range: REALISTIC.range });
  });

  bench('stress (10h axis, dense range)', () => {
    niceTicks({ domain: STRESS.domain, range: STRESS.range });
  });

  bench('stress + custom format', () => {
    niceTicks({
      domain: STRESS.domain,
      range: STRESS.range,
      format: v => `#${v}`,
    });
  });
});

describe('ticks: timeTicks (human time ladder)', () => {
  bench('realistic (600s axis)', () => {
    timeTicks({ domain: REALISTIC.domain, range: REALISTIC.range });
  });

  bench('stress (10h axis, dense range)', () => {
    timeTicks({ domain: STRESS.domain, range: STRESS.range });
  });
});

describe('ticks: timecodeTicks (frame-aligned, fps conversion)', () => {
  bench('realistic (600s @ 30fps)', () => {
    timecodeTicks({ domain: REALISTIC.domain, range: REALISTIC.range, fps: 30 });
  });

  bench('stress (10h @ 29.97fps drop-frame labels)', () => {
    timecodeTicks({ domain: STRESS.domain, range: STRESS.range, fps: 29.97, dropFrame: true });
  });
});

describe('ticks: frameTicks (integer-frame axis)', () => {
  bench('realistic (18000-frame axis)', () => {
    frameTicks({ domain: [0, 18_000], range: REALISTIC.range, fps: 30 });
  });

  bench('stress (1.08M-frame axis, dense range)', () => {
    frameTicks({ domain: [0, 1_080_000], range: STRESS.range, fps: 30 });
  });
});

// ===========================================================================
// 3. Timecode formatting — per-tick label cost (drop-frame is the worst case)
// ===========================================================================

describe('timecode: framesToTimecode label formatting', () => {
  bench('non-drop ×100', () => {
    for (let i = 0; i < FRAMES_100.length; i++) {
      framesToTimecode(FRAMES_100[i]!, 30, false);
    }
  });

  bench('drop-frame 29.97 ×100', () => {
    for (let i = 0; i < FRAMES_100.length; i++) {
      framesToTimecode(FRAMES_100[i]!, 29.97, true);
    }
  });

  bench('drop-frame 29.97 ×1000', () => {
    for (let i = 0; i < FRAMES_1000.length; i++) {
      framesToTimecode(FRAMES_1000[i]!, 29.97, true);
    }
  });
});

describe('timecode: scalar label formatters', () => {
  bench('formatClock ×1000', () => {
    for (let i = 0; i < 1000; i++) formatClock(i * 7.5);
  });

  bench('formatTimecode ×1000 (@30fps)', () => {
    for (let i = 0; i < 1000; i++) formatTimecode(i * 0.5, 30, false);
  });

  bench('formatFrames ×1000', () => {
    for (let i = 0; i < 1000; i++) formatFrames(i * 137);
  });

  bench('secondsToFrames ×1000', () => {
    for (let i = 0; i < 1000; i++) secondsToFrames(i * 0.0417, 23.976);
  });
});

// ===========================================================================
// 4. useScale composable — build cost, pointer-move loop, reactive recompute
// ===========================================================================

describe('useScale: composable construction', () => {
  bench('build (plain options)', () => {
    useScale({ domain: REALISTIC.domain, range: REALISTIC.range });
  });

  bench('build (clamp + step + ticks)', () => {
    useScale({
      domain: REALISTIC.domain,
      range: REALISTIC.range,
      clamp: true,
      step: 0.1,
      tickKind: 'time',
    });
  });
});

describe('useScale: pointer-move loop (scale/invert/roundValue)', () => {
  // Build once outside the bench body — the hot path is the per-event call,
  // not construction. Closures read reactive sources at call time.
  const s = useScale({
    domain: REALISTIC.domain,
    range: REALISTIC.range,
    clamp: true,
    step: 0.1,
  });

  bench('invert+round ×100 events', () => {
    for (let i = 0; i < POINTER_100.length; i++) {
      s.roundValue(s.invert(POINTER_100[i]!));
    }
  });

  bench('invert+round ×1000 events', () => {
    for (let i = 0; i < POINTER_1000.length; i++) {
      s.roundValue(s.invert(POINTER_1000[i]!));
    }
  });

  bench('scale ×1000 events', () => {
    for (let i = 0; i < VALUES_1000.length; i++) {
      s.scale(VALUES_1000[i]!);
    }
  });
});

describe('useScale: reactive tick recompute on domain change (zoom/pan)', () => {
  // A reactive domain whose mutation invalidates the ticks computed, simulating
  // a zoom/pan gesture forcing tick regeneration + major/minor split.
  const domain = ref<readonly [number, number]>([0, 600]);
  const s = useScale({ domain, range: REALISTIC.range, tickKind: 'time' });
  // Prime the computed.
  void s.ticks.value;
  let frame = 0;

  bench('zoom step → recompute ticks/major/minor', () => {
    // Deterministic zoom: shrink/grow the window each iteration.
    frame++;
    const half = 50 + (frame % 250);
    domain.value = [0, half * 2];
    // Touch all three dependent computeds (what a ruler renders).
    void s.ticks.value.length;
    void s.majorTicks.value.length;
    void s.minorTicks.value.length;
  });
});
