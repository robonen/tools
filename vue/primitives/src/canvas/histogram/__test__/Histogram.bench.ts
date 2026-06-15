import { mount } from '@vue/test-utils';
import { bench, describe } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { HistogramBars, HistogramRoot } from '../index';
import type { HistogramBarChannel, HistogramData, HistogramScaleType } from '../utils';
import {
  getChannelBins,
  histogramMax,
  projectBarHeight,
  projectBars,
} from '../utils';

// ---------------------------------------------------------------------------
// Deterministic fixtures (NO Math.random). Bins are seeded by index/formula so
// every run measures identical work. Each builder produces a bell-ish tonal
// curve plus a highlight bump, the shape a real image histogram carries — tall
// central spike, long zero tails — which exercises both the linear and log
// projection branches and the all-zero guards.
// ---------------------------------------------------------------------------

/** A bell bump centred on `center` bins, scaled to `peak`, sampled over `n` bins. */
function bell(n: number, center: number, spread: number, peak: number): number[] {
  const out: number[] = Array.from({ length: n });
  for (let i = 0; i < n; i++) {
    const d = (i - center) / spread;
    out[i] = Math.round(peak * Math.exp(-0.5 * d * d));
  }
  return out;
}

/** Realistic single-channel bins of length `n` (midtone hump + highlight bump). */
function makeBins(n: number): number[] {
  const a = bell(n, n * 0.44, n * 0.14, 1000);
  const b = bell(n, n * 0.78, n * 0.08, 280);
  const out: number[] = Array.from({ length: n });
  for (let i = 0; i < n; i++) out[i] = a[i]! + b[i]!;
  return out;
}

/** A per-channel record (r/g/b/l) of length `n`, each primary peaking elsewhere. */
function makeChannelData(n: number): HistogramData {
  return {
    l: makeBins(n),
    r: bell(n, n * 0.53, n * 0.16, 760),
    g: bell(n, n * 0.41, n * 0.12, 940),
    b: bell(n, n * 0.31, n * 0.18, 620),
  };
}

// 256 is the canonical bin count (8-bit channel); 100 / 1000 bracket realistic
// and stress scales. 50 / 500 bracket the rendered bar count for components.
const bins100 = makeBins(100);
const bins256 = makeBins(256);
const bins1000 = makeBins(1000);

const binsZero256 = Array.from<number>({ length: 256 }).fill(0);

const record100 = makeChannelData(100);
const record1000 = makeChannelData(1000);

const SCALES: HistogramScaleType[] = ['linear', 'log'];
const PRIMARIES: HistogramBarChannel[] = ['l', 'r', 'g', 'b'];

const bars50 = makeBins(50);
const bars500 = makeBins(500);

// Stable harnesses so the component benches measure render cost, not the cost
// of redefining a component each iteration.
const RootBarsHarness = defineComponent({
  props: {
    data: { type: [Array, Object] as unknown as () => HistogramData, required: true },
    channel: { type: String, default: 'l' },
    scaleType: { type: String, default: 'linear' },
  },
  setup(props) {
    return () =>
      h(
        HistogramRoot,
        { data: props.data, channel: props.channel, scaleType: props.scaleType },
        { default: () => h(HistogramBars) },
      );
  },
});

// ---------------------------------------------------------------------------
// Pure projection math — the per-channel hot path the root runs on every data
// or prop change (peak scan → normalise every bin → fresh packed array).
// ---------------------------------------------------------------------------

describe('histogramMax — peak scan', () => {
  bench('100 bins', () => {
    histogramMax(bins100);
  });

  bench('256 bins', () => {
    histogramMax(bins256);
  });

  bench('1000 bins', () => {
    histogramMax(bins1000);
  });

  bench('256 bins — all zero (guard path)', () => {
    histogramMax(binsZero256);
  });
});

describe('projectBars — linear (peak scan + normalise + alloc)', () => {
  bench('100 bins', () => {
    projectBars(bins100, 'linear');
  });

  bench('256 bins', () => {
    projectBars(bins256, 'linear');
  });

  bench('1000 bins', () => {
    projectBars(bins1000, 'linear');
  });
});

describe('projectBars — log (log1p per bin + alloc)', () => {
  bench('100 bins', () => {
    projectBars(bins100, 'log');
  });

  bench('256 bins', () => {
    projectBars(bins256, 'log');
  });

  bench('1000 bins', () => {
    projectBars(bins1000, 'log');
  });
});

describe('projectBars — all-zero guard (no NaN, no divide)', () => {
  bench('256 bins — linear', () => {
    projectBars(binsZero256, 'linear');
  });

  bench('256 bins — log', () => {
    projectBars(binsZero256, 'log');
  });
});

describe('projectBarHeight — per-bin scalar (1000x loop)', () => {
  const max = histogramMax(bins1000);

  bench('linear x1000', () => {
    for (let i = 0; i < bins1000.length; i++) projectBarHeight(bins1000[i]!, max, 'linear');
  });

  bench('log x1000', () => {
    for (let i = 0; i < bins1000.length; i++) projectBarHeight(bins1000[i]!, max, 'log');
  });
});

// ---------------------------------------------------------------------------
// Full root projection across every primary + both scales — the work the root's
// `bars()`/`hasData` perform when re-deriving an RGB composite. getChannelBins
// resolves the record per channel; projectBars then scans + packs each.
// ---------------------------------------------------------------------------

describe('per-channel projection (RGB composite, record data)', () => {
  bench('4 channels x 100 bins x 2 scales', () => {
    for (const scale of SCALES) {
      for (const ch of PRIMARIES) {
        projectBars(getChannelBins(record100, ch, 'l'), scale);
      }
    }
  });

  bench('4 channels x 1000 bins x 2 scales', () => {
    for (const scale of SCALES) {
      for (const ch of PRIMARIES) {
        projectBars(getChannelBins(record1000, ch, 'l'), scale);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Component mount — full Root → Bars → per-bar Primitive tree. Each bar is its
// own DOM node, so cost scales with the rendered bar count.
// ---------------------------------------------------------------------------

describe('HistogramRoot + HistogramBars — mount', () => {
  bench('50 bars (linear)', () => {
    const w = mount(RootBarsHarness, {
      props: { data: bars50, channel: 'l', scaleType: 'linear' },
      attachTo: document.body,
    });
    w.unmount();
  });

  bench('500 bars (linear)', () => {
    const w = mount(RootBarsHarness, {
      props: { data: bars500, channel: 'l', scaleType: 'linear' },
      attachTo: document.body,
    });
    w.unmount();
  });

  bench('500 bars (log)', () => {
    const w = mount(RootBarsHarness, {
      props: { data: bars500, channel: 'l', scaleType: 'log' },
      attachTo: document.body,
    });
    w.unmount();
  });
});

// ---------------------------------------------------------------------------
// Re-render after a prop change — the realistic interaction (the demo toggles
// channel and scaleType). Re-projects + patches the existing bar tree in place.
// ---------------------------------------------------------------------------

describe('HistogramRoot + HistogramBars — update after prop change', () => {
  bench('500 bars — scaleType linear → log', async () => {
    const w = mount(RootBarsHarness, {
      props: { data: bars500, channel: 'l', scaleType: 'linear' },
      attachTo: document.body,
    });
    await w.setProps({ scaleType: 'log' });
    await nextTick();
    w.unmount();
  });

  bench('record data — channel l → rgb (expand to 3 primaries)', async () => {
    const w = mount(RootBarsHarness, {
      props: { data: record100, channel: 'l', scaleType: 'linear' },
      attachTo: document.body,
    });
    await w.setProps({ channel: 'rgb' });
    await nextTick();
    w.unmount();
  });
});
