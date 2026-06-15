import { bench, describe } from 'vitest';
import { defineComponent, h, nextTick, ref, render } from 'vue';
import type { HSVA } from '../../../internal/color';
import { clampChannel, hsvToRgb, hsvaToCss } from '../../../internal/color';
import { useHsvaSetters } from '../../color-field/useColorState';
import { ColorAreaRoot, ColorAreaThumb } from '../index';

// ---------------------------------------------------------------------------
// Fixtures — deterministic, no Math.random / no network. The color area's hot
// path is per-pointer-move 2D saturation/value math + the preserve-hue setters
// that commit a fresh HSVA on every drag tick, plus the `hsvToRgb` background
// recompute. We seed every value by index/formula so runs are reproducible.
// ---------------------------------------------------------------------------

/** Build N deterministic HSVA samples sweeping hue/sat/val across their ranges. */
function makeColors(n: number): HSVA[] {
  const out: HSVA[] = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = {
      h: (i * 360) / n, // 0 → 360 across the hue wheel (hits every sector)
      s: (i % 100) / 100, // 0 → 0.99 (includes the grey s=0 edge)
      v: ((i * 7) % 100) / 100, // de-correlated brightness sweep
      a: 1,
    };
  }
  return out;
}

const colors100 = makeColors(100);
const colors1000 = makeColors(1000);

/**
 * Deterministic pointer samples relative to a 320x240 track rect, mimicking a
 * drag that sweeps the whole square (the input to `setFromPointer`).
 */
const TRACK = { left: 16, top: 24, width: 320, height: 240 } as const;

function makePointers(n: number): Array<{ x: number; y: number }> {
  const out = new Array<{ x: number; y: number }>(n);
  for (let i = 0; i < n; i++) {
    // Lissajous-ish deterministic sweep covering the rect (and slightly past it
    // so clamping is exercised) without any randomness.
    const t = i / n;
    out[i] = {
      x: TRACK.left + (Math.sin(i * 0.37) * 0.5 + 0.5) * TRACK.width,
      y: TRACK.top + t * TRACK.height,
    };
  }
  return out;
}

const pointers100 = makePointers(100);
const pointers1000 = makePointers(1000);

/**
 * Pure replica of `ColorAreaRoot.setFromPointer`'s math (rect-relative
 * normalize → optional RTL flip → clamp) so the pointer hot path is measured
 * without DOM/layout noise. Returns the resolved saturation/value pair.
 */
function pointerToSV(
  pt: { x: number; y: number },
  rect: { left: number; top: number; width: number; height: number },
  rtl: boolean,
): { s: number; v: number } {
  if (rect.width === 0 || rect.height === 0) return { s: 0, v: 0 };
  let sx = (pt.x - rect.left) / rect.width;
  if (rtl) sx = 1 - sx;
  const vy = 1 - (pt.y - rect.top) / rect.height;
  return { s: clampChannel(sx, 1), v: clampChannel(vy, 1) };
}

// ---------------------------------------------------------------------------
// Pure pointer/clamp math — the per-move computation, by scale.
// ---------------------------------------------------------------------------

describe('pointer → saturation/value math', () => {
  bench('pointerToSV — 100 moves (ltr)', () => {
    for (let i = 0; i < pointers100.length; i++) {
      pointerToSV(pointers100[i]!, TRACK, false);
    }
  });

  bench('pointerToSV — 1000 moves (ltr)', () => {
    for (let i = 0; i < pointers1000.length; i++) {
      pointerToSV(pointers1000[i]!, TRACK, false);
    }
  });

  bench('pointerToSV — 1000 moves (rtl flip)', () => {
    for (let i = 0; i < pointers1000.length; i++) {
      pointerToSV(pointers1000[i]!, TRACK, true);
    }
  });
});

describe('clampChannel — channel clamp', () => {
  bench('clampChannel — 1000 calls', () => {
    for (let i = 0; i < pointers1000.length; i++) {
      // Drive past both rails to exercise both clamp branches deterministically.
      clampChannel((i - 250) / 500, 1);
    }
  });
});

// ---------------------------------------------------------------------------
// hsvToRgb — the background-hue recompute (`hueColor`) + thumb swatch color.
// Runs on every hue change; sweeps all six hue sectors.
// ---------------------------------------------------------------------------

describe('hsvToRgb — hue background recompute', () => {
  bench('hsvToRgb — 100 colors', () => {
    for (let i = 0; i < colors100.length; i++) {
      hsvToRgb({ h: colors100[i]!.h, s: 1, v: 1 });
    }
  });

  bench('hsvToRgb — 1000 colors', () => {
    for (let i = 0; i < colors1000.length; i++) {
      hsvToRgb({ h: colors1000[i]!.h, s: 1, v: 1 });
    }
  });

  bench('hsvaToCss — 1000 colors (full hsva)', () => {
    for (let i = 0; i < colors1000.length; i++) {
      hsvaToCss(colors1000[i]!);
    }
  });
});

// ---------------------------------------------------------------------------
// Preserve-hue setters — the state commit run on every drag tick / key nudge.
// `useHsvaSetters` tracks the last meaningful hue and rebuilds a fresh HSVA.
// We drive it through a deterministic sweep including the s=0 / v=0 grey edges.
// ---------------------------------------------------------------------------

describe('preserve-hue setters — drag/key commit', () => {
  bench('setSaturationValue — 1000 commits (sweep incl. grey)', () => {
    const hsva = ref<HSVA>({ h: 0, s: 1, v: 1, a: 1 });
    const { setSaturationValue } = useHsvaSetters(hsva);
    for (let i = 0; i < pointers1000.length; i++) {
      const { s, v } = pointerToSV(pointers1000[i]!, TRACK, false);
      setSaturationValue(s, v);
    }
  });

  bench('setSaturation + setValue — 1000 key nudges', () => {
    const hsva = ref<HSVA>({ h: 200, s: 0.5, v: 0.5, a: 1 });
    const { setSaturation, setValue } = useHsvaSetters(hsva);
    for (let i = 0; i < colors1000.length; i++) {
      setSaturation(colors1000[i]!.s);
      setValue(colors1000[i]!.v);
    }
  });
});

// ---------------------------------------------------------------------------
// Component mount — ColorAreaRoot + N ColorAreaThumb children. A single area
// normally has one thumb, but stacking N thumbs over the shared context stresses
// the provide/inject + per-thumb position/aria computeds at realistic (50) and
// heavy (500) scale.
// ---------------------------------------------------------------------------

function makeAreaWithThumbs(thumbCount: number, value: HSVA) {
  return defineComponent({
    setup() {
      const model = ref<HSVA>(value);
      return () =>
        h(
          ColorAreaRoot,
          {
            modelValue: model.value,
            'onUpdate:modelValue': (v: HSVA | null) => {
              if (v) model.value = v;
            },
          },
          {
            default: () => {
              const thumbs = new Array(thumbCount);
              for (let i = 0; i < thumbCount; i++) {
                thumbs[i] = h(ColorAreaThumb, {
                  key: i,
                  'aria-label': `thumb-${i}`,
                });
              }
              return thumbs;
            },
          },
        );
    },
  });
}

describe('mount — ColorAreaRoot + N thumbs', () => {
  const seed: HSVA = { h: 265, s: 0.72, v: 0.86, a: 1 };

  bench('mount + unmount — 50 thumbs', () => {
    const container = document.createElement('div');
    render(h(makeAreaWithThumbs(50, seed)), container);
    render(null, container);
  });

  bench('mount + unmount — 500 thumbs', () => {
    const container = document.createElement('div');
    render(h(makeAreaWithThumbs(500, seed)), container);
    render(null, container);
  });
});

// ---------------------------------------------------------------------------
// Re-render after a v-model change — the realistic interaction tick: updating
// the bound HSVA re-runs `hueColor` (hsvToRgb), the thumb `positionStyle`, and
// the `aria-valuetext`/`aria-valuenow` computeds, then patches the DOM.
// ---------------------------------------------------------------------------

describe('update — re-render after HSVA change', () => {
  const a: HSVA = { h: 10, s: 0.3, v: 0.9, a: 1 };
  const b: HSVA = { h: 280, s: 0.85, v: 0.4, a: 1 };

  bench('1 thumb — mount then patch new HSVA', async () => {
    const model = ref<HSVA>(a);
    const Comp = defineComponent({
      setup: () => () =>
        h(
          ColorAreaRoot,
          {
            modelValue: model.value,
            'onUpdate:modelValue': (v: HSVA | null) => {
              if (v) model.value = v;
            },
          },
          { default: () => h(ColorAreaThumb, { 'aria-label': 'thumb' }) },
        ),
    });
    const container = document.createElement('div');
    render(h(Comp), container);
    model.value = model.value === a ? b : a;
    await nextTick();
    render(null, container);
  });
});
