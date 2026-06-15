import { mount } from '@vue/test-utils';
import { bench, describe } from 'vitest';
import { h, nextTick } from 'vue';
// Pure hot-path math + tick generators live in the shared `internal/scale`
// module, re-exported from the package barrel. Import them relatively so the
// bench tracks the same source the ruler consumes.
import {
  formatClock,
  formatFrames,
  formatTimecode,
  frameTicks,
  framesToTimecode,
  getStepDecimals,
  niceTicks,
  roundToStep,
  scaleLinear,
  secondsToFrames,
  timeTicks,
  timecodeTicks,
  useScale,
} from '../../../internal/scale';
import { formatTimeForMode, modeToTickKind, tickFormatFor } from '../utils';
import { TimeRulerCursor, TimeRulerRoot } from '../index';

// ---------------------------------------------------------------------------
// Fixtures (deterministic — values seeded by index/formula, no Math.random).
// ---------------------------------------------------------------------------

const FPS = 30;

// A "visible window" mirrors the demo: offset (left-edge seconds) + a width in
// pixels projected through a zoom (px/s). Two scales: realistic and stress.
//   realistic: 600px wide @ 40 px/s over a 10-minute clip → window ~15s
//   stress:    a long zoomed-out window so the generators emit many ticks.
function windowFor(widthPx: number, zoomPxPerSec: number, offsetSec: number): {
  domain: readonly [number, number];
  range: readonly [number, number];
} {
  const span = widthPx / zoomPxPerSec;
  return {
    domain: [offsetSec, offsetSec + span] as const,
    range: [0, widthPx] as const,
  };
}

// Realistic single-screen window (demo defaults: 600px, 40 px/s, offset 12s).
const REALISTIC = windowFor(600, 40, 12);
// Stress window: a wide, zoomed-out viewport that walks many tick candidates.
const STRESS = windowFor(4000, 4, 0);

// A bank of seconds values for scalar projection / formatter benches. Seeded by
// a deterministic formula so every run hits identical inputs.
function secondsBank(n: number): Float64Array {
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    // Spread across a 10-minute clip with frame-fractional offsets so the
    // timecode/frame paths exercise rounding, not just integers.
    out[i] = (i * 600) / n + (i % 30) / FPS;
  }
  return out;
}

// A bank of pixel offsets for the invert (pointer→time) hot path.
function pixelBank(n: number, widthPx: number): Float64Array {
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = (i / (n - 1 || 1)) * widthPx;
  }
  return out;
}

const SECONDS_100 = secondsBank(100);
const SECONDS_1000 = secondsBank(1000);
const PIXELS_100 = pixelBank(100, 600);
const PIXELS_1000 = pixelBank(1000, 4000);

// A frame bank for the integer-frame generator / formatters.
const FRAMES_1000 = (() => {
  const out = new Float64Array(1000);
  for (let i = 0; i < out.length; i++) out[i] = i * 37; // arbitrary stable stride
  return out;
})();

// ---------------------------------------------------------------------------
// 1. Tick generation — the ruler's heaviest per-frame compute. Each generator
//    is benched at a realistic single-screen window and a stress window.
// ---------------------------------------------------------------------------

describe('tick generation — timeTicks (seconds mode)', () => {
  bench('realistic window (~15s @ 40px/s)', () => {
    timeTicks({ domain: REALISTIC.domain, range: REALISTIC.range, targetDensity: 80 });
  });

  bench('stress window (1000s @ 4px/s)', () => {
    timeTicks({ domain: STRESS.domain, range: STRESS.range, targetDensity: 80 });
  });
});

describe('tick generation — timecodeTicks (timecode mode)', () => {
  bench('realistic window', () => {
    timecodeTicks({ domain: REALISTIC.domain, range: REALISTIC.range, fps: FPS, targetDensity: 80 });
  });

  bench('stress window', () => {
    timecodeTicks({ domain: STRESS.domain, range: STRESS.range, fps: FPS, targetDensity: 80 });
  });

  bench('realistic window — drop-frame labels', () => {
    timecodeTicks({ domain: REALISTIC.domain, range: REALISTIC.range, fps: 29.97, dropFrame: true, targetDensity: 80 });
  });
});

describe('tick generation — frameTicks (frames mode)', () => {
  // frames mode routes the seconds domain through the timecode ticker with a
  // frame-number `format` override; bench that exact path too.
  const frameFormat = tickFormatFor('frames', FPS);

  bench('realistic window — timecode ticker w/ frame labels', () => {
    timecodeTicks({ domain: REALISTIC.domain, range: REALISTIC.range, fps: FPS, format: frameFormat, targetDensity: 80 });
  });

  bench('stress window — integer-frame axis', () => {
    // A wide integer-frame domain (0..18000 frames ≈ 600s @ 30fps).
    frameTicks({ domain: [0, 18000] as const, range: [0, 4000] as const, fps: FPS, targetDensity: 80 });
  });
});

describe('tick generation — niceTicks (generic axis)', () => {
  bench('realistic window', () => {
    niceTicks({ domain: REALISTIC.domain, range: REALISTIC.range, targetDensity: 80 });
  });

  bench('stress window', () => {
    niceTicks({ domain: STRESS.domain, range: STRESS.range, targetDensity: 80 });
  });
});

// ---------------------------------------------------------------------------
// 2. Pure projection math — `scale` / `invert` run on the pointer hot path.
//    Bench the underlying scaleLinear over 100 / 1000 inputs.
// ---------------------------------------------------------------------------

describe('projection math — scaleLinear (time → px)', () => {
  const [d0, d1] = REALISTIC.domain;
  const [r0, r1] = REALISTIC.range;

  bench('100 values', () => {
    let acc = 0;
    for (let i = 0; i < SECONDS_100.length; i++) {
      acc += scaleLinear(SECONDS_100[i]!, d0, d1, r0, r1);
    }
    return acc;
  });

  bench('1000 values', () => {
    let acc = 0;
    for (let i = 0; i < SECONDS_1000.length; i++) {
      acc += scaleLinear(SECONDS_1000[i]!, d0, d1, r0, r1);
    }
    return acc;
  });
});

describe('projection math — scaleLinear (px → time, invert)', () => {
  const [d0, d1] = STRESS.domain;
  const [r0, r1] = STRESS.range;

  bench('100 pixels', () => {
    let acc = 0;
    for (let i = 0; i < PIXELS_100.length; i++) {
      acc += scaleLinear(PIXELS_100[i]!, r0, r1, d0, d1);
    }
    return acc;
  });

  bench('1000 pixels', () => {
    let acc = 0;
    for (let i = 0; i < PIXELS_1000.length; i++) {
      acc += scaleLinear(PIXELS_1000[i]!, r0, r1, d0, d1);
    }
    return acc;
  });
});

describe('projection math — roundToStep (snap, pointer path)', () => {
  const step = 0.5;
  const decimals = getStepDecimals(step);

  bench('100 values', () => {
    let acc = 0;
    for (let i = 0; i < SECONDS_100.length; i++) {
      acc += roundToStep(SECONDS_100[i]!, step, 0, decimals);
    }
    return acc;
  });

  bench('1000 values', () => {
    let acc = 0;
    for (let i = 0; i < SECONDS_1000.length; i++) {
      acc += roundToStep(SECONDS_1000[i]!, step, 0, decimals);
    }
    return acc;
  });
});

// ---------------------------------------------------------------------------
// 3. Live scale via useScale — the projector closures the ruler actually calls
//    (read domain/range/reverse at call time). Bench the realistic per-frame
//    burst: project every tick value to a pixel + invert a pointer sweep.
// ---------------------------------------------------------------------------

describe('useScale — projector closures', () => {
  const { scale, invert } = useScale({
    domain: () => REALISTIC.domain,
    range: () => REALISTIC.range,
    tickKind: () => 'time',
    tickOptions: () => ({ targetDensity: 80 }),
  });

  bench('scale() × 1000', () => {
    let acc = 0;
    for (let i = 0; i < SECONDS_1000.length; i++) acc += scale(SECONDS_1000[i]!);
    return acc;
  });

  bench('invert() × 100 (pointer sweep)', () => {
    let acc = 0;
    for (let i = 0; i < PIXELS_100.length; i++) acc += invert(PIXELS_100[i]!);
    return acc;
  });
});

// ---------------------------------------------------------------------------
// 4. Per-mode label formatters — run once per major tick on every regenerate.
// ---------------------------------------------------------------------------

describe('label formatting — per mode', () => {
  bench('formatClock × 1000 (seconds)', () => {
    let len = 0;
    for (let i = 0; i < SECONDS_1000.length; i++) len += formatClock(SECONDS_1000[i]!).length;
    return len;
  });

  bench('formatTimecode × 1000 (timecode)', () => {
    let len = 0;
    for (let i = 0; i < SECONDS_1000.length; i++) len += formatTimecode(SECONDS_1000[i]!, FPS).length;
    return len;
  });

  bench('framesToTimecode × 1000 — drop-frame', () => {
    let len = 0;
    for (let i = 0; i < FRAMES_1000.length; i++) len += framesToTimecode(FRAMES_1000[i]!, 29.97, true).length;
    return len;
  });

  bench('formatFrames × 1000 (frames)', () => {
    let len = 0;
    for (let i = 0; i < FRAMES_1000.length; i++) len += formatFrames(FRAMES_1000[i]!).length;
    return len;
  });

  bench('formatTimeForMode × 1000 — dispatch (timecode)', () => {
    let len = 0;
    for (let i = 0; i < SECONDS_1000.length; i++) len += formatTimeForMode(SECONDS_1000[i]!, 'timecode', FPS).length;
    return len;
  });
});

// ---------------------------------------------------------------------------
// 5. Mode → tick-kind / format selection (cheap, but runs on every prop change).
// ---------------------------------------------------------------------------

describe('mode plumbing', () => {
  const modes = ['seconds', 'timecode', 'frames'] as const;

  bench('modeToTickKind × 3 modes', () => {
    for (const m of modes) modeToTickKind(m);
  });

  bench('tickFormatFor × 3 modes', () => {
    for (const m of modes) tickFormatFor(m, FPS);
  });

  bench('secondsToFrames × 1000', () => {
    let acc = 0;
    for (let i = 0; i < SECONDS_1000.length; i++) acc += secondsToFrames(SECONDS_1000[i]!, FPS);
    return acc;
  });
});

// ---------------------------------------------------------------------------
// 6. Component lifecycle — mount cost (builds useScale + tick computeds + the
//    accessible group), and a re-render after a prop change. The default slot
//    renders one DOM node per tick, so this captures the real render-N cost.
// ---------------------------------------------------------------------------

// Render the ruler's tick layer + a cursor, exactly like the demo, so the slot
// work (v-for over `ticks`, per-tick class/style, cursor projection) is benched.
function rulerSlot() {
  return {
    default: ({ ticks, formatTime }: { ticks: Array<{ value: number; px: number; major: boolean; label: string }>; formatTime: (s: number) => string }) =>
      ticks
        .map(tick =>
          h(
            'div',
            { key: tick.value, class: tick.major ? 'major' : 'minor', style: { left: `${tick.px}px` } },
            tick.major ? [h('span', tick.label)] : [],
          ),
        )
        .concat([
          h(TimeRulerCursor as never, { time: 72 }, {
            default: ({ time }: { time: number }) => h('span', formatTime(time)),
          }),
        ]),
  };
}

describe('TimeRulerRoot — mount', () => {
  bench('mount — seconds mode', () => {
    const w = mount(TimeRulerRoot, {
      props: { duration: 600, zoom: 40, offset: 0, fps: FPS, mode: 'seconds', focusable: true, wheel: true, draggable: true },
      slots: rulerSlot(),
      attachTo: document.body,
    });
    w.unmount();
  });

  bench('mount — timecode mode', () => {
    const w = mount(TimeRulerRoot, {
      props: { duration: 600, zoom: 40, offset: 0, fps: FPS, mode: 'timecode', focusable: true },
      slots: rulerSlot(),
      attachTo: document.body,
    });
    w.unmount();
  });

  bench('mount — frames mode', () => {
    const w = mount(TimeRulerRoot, {
      props: { duration: 600, zoom: 40, offset: 0, fps: FPS, mode: 'frames', focusable: true },
      slots: rulerSlot(),
      attachTo: document.body,
    });
    w.unmount();
  });
});

describe('TimeRulerRoot — re-render after prop change', () => {
  bench('zoom change (pan/zoom gesture stream)', async () => {
    const w = mount(TimeRulerRoot, {
      props: { duration: 600, zoom: 40, offset: 0, fps: FPS, mode: 'timecode' },
      slots: rulerSlot(),
      attachTo: document.body,
    });
    // A zoom write re-derives the visible window → ticks computed → slot re-render.
    await w.setProps({ zoom: 120 });
    await nextTick();
    w.unmount();
  });

  bench('offset change (pan stream)', async () => {
    const w = mount(TimeRulerRoot, {
      props: { duration: 600, zoom: 40, offset: 0, fps: FPS, mode: 'timecode' },
      slots: rulerSlot(),
      attachTo: document.body,
    });
    await w.setProps({ offset: 120 });
    await nextTick();
    w.unmount();
  });

  bench('mode change (timecode → frames, regenerate ladder)', async () => {
    const w = mount(TimeRulerRoot, {
      props: { duration: 600, zoom: 40, offset: 0, fps: FPS, mode: 'timecode' },
      slots: rulerSlot(),
      attachTo: document.body,
    });
    await w.setProps({ mode: 'frames' });
    await nextTick();
    w.unmount();
  });
});
