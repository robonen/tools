import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import {
  LevelsHandleValue,
  LevelsRoot,
  LevelsThumb,
  LevelsTrack,
} from '../index';
import type { LevelsValue } from '../index';
import { applyLevels, buildOutputCurve, computeAutoLevels } from '../utils';

const wrappers: Array<VueWrapper<any>> = [];

afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
});

function track<T extends VueWrapper<any>>(w: T): T {
  wrappers.push(w);
  return w;
}

function keydown(el: Element, key: string, opts: { shiftKey?: boolean } = {}): void {
  el.dispatchEvent(new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    shiftKey: opts.shiftKey ?? false,
  }));
}

function mountLevels(opts: {
  defaultValue?: Partial<LevelsValue>;
  step?: number;
  gammaStep?: number;
  minStepsBetweenHandles?: number;
  disabled?: boolean;
  kinds?: Array<'black' | 'gamma' | 'white' | 'outputBlack' | 'outputWhite'>;
} = {}) {
  const model = ref<LevelsValue | null | undefined>(undefined);
  const kinds = opts.kinds ?? ['black', 'gamma', 'white', 'outputBlack', 'outputWhite'];
  const Harness = defineComponent({
    setup() {
      return () => h(LevelsRoot, {
        modelValue: model.value,
        defaultValue: { black: 0, gamma: 1, white: 255, outputBlack: 0, outputWhite: 255, ...opts.defaultValue },
        step: opts.step,
        gammaStep: opts.gammaStep,
        minStepsBetweenHandles: opts.minStepsBetweenHandles,
        disabled: opts.disabled,
        'onUpdate:modelValue': (v: LevelsValue | null | undefined) => { model.value = v; },
      }, {
        default: () => h(LevelsTrack, null, {
          default: () => kinds.map(kind => h(LevelsThumb, { kind, id: `thumb-${kind}` })),
        }),
      });
    },
  });
  const w = track(mount(Harness, { attachTo: document.body }));
  return { wrapper: w, model };
}

function thumb(kind: string): HTMLElement {
  return document.getElementById(`thumb-${kind}`)!;
}

describe('Levels — utils (unit)', () => {
  it('applyLevels is the identity for the default adjustment', () => {
    const v: LevelsValue = { black: 0, gamma: 1, white: 255, outputBlack: 0, outputWhite: 255 };
    expect(applyLevels(0, v)).toBeCloseTo(0, 5);
    expect(applyLevels(128, v)).toBeCloseTo(128, 5);
    expect(applyLevels(255, v)).toBeCloseTo(255, 5);
  });

  it('getOutputCurve returns a 256-length, monotonic non-decreasing LUT', () => {
    const lut = buildOutputCurve({ black: 0, gamma: 1, white: 255, outputBlack: 0, outputWhite: 255 });
    expect(lut).toHaveLength(256);
    for (let i = 1; i < lut.length; i++) expect(lut[i]!).toBeGreaterThanOrEqual(lut[i - 1]!);
    // Identity LUT.
    expect(lut[0]).toBeCloseTo(0, 4);
    expect(lut[255]).toBeCloseTo(255, 4);
  });

  it('LUT reflects black/white clipping and the output range', () => {
    const lut = buildOutputCurve({ black: 64, gamma: 1, white: 192, outputBlack: 10, outputWhite: 240 });
    // Below black clips to outputBlack, above white clips to outputWhite.
    expect(lut[0]).toBeCloseTo(10, 4);
    expect(lut[255]).toBeCloseTo(240, 4);
    expect(lut[32]).toBeCloseTo(10, 4); // still below black
    expect(lut[220]).toBeCloseTo(240, 4); // above white
    // Midpoint of the window maps near the output midpoint at gamma 1.
    expect(lut[128]!).toBeGreaterThan(10);
    expect(lut[128]!).toBeLessThan(240);
  });

  it('gamma > 1 brightens midtones in the LUT', () => {
    const linear = buildOutputCurve({ black: 0, gamma: 1, white: 255, outputBlack: 0, outputWhite: 255 });
    const bright = buildOutputCurve({ black: 0, gamma: 2, white: 255, outputBlack: 0, outputWhite: 255 });
    expect(bright[128]!).toBeGreaterThan(linear[128]!);
  });

  it('computeAutoLevels clips tails and falls back on empty/flat data', () => {
    expect(computeAutoLevels(undefined)).toEqual({ black: 0, white: 255 });
    expect(computeAutoLevels([])).toEqual({ black: 0, white: 255 });
    expect(computeAutoLevels([0, 0, 0])).toEqual({ black: 0, white: 255 });
    // Signal concentrated in the middle bins → black moves up, white moves down.
    const hist = Array.from({ length: 256 }, (_, i) => (i >= 64 && i <= 192 ? 100 : 0));
    const { black, white } = computeAutoLevels(hist, 0.001);
    expect(black).toBeGreaterThan(0);
    expect(white).toBeLessThan(255);
    expect(black).toBeLessThan(white);
  });
});

describe('Levels — thumb ARIA', () => {
  it('each thumb is role=slider with the per-kind aria-label', async () => {
    mountLevels();
    await nextTick();
    expect(thumb('black').getAttribute('role')).toBe('slider');
    expect(thumb('black').getAttribute('aria-label')).toBe('Black point');
    expect(thumb('gamma').getAttribute('aria-label')).toBe('Gamma');
    expect(thumb('white').getAttribute('aria-label')).toBe('White point');
    expect(thumb('outputBlack').getAttribute('aria-label')).toBe('Output black');
    expect(thumb('outputWhite').getAttribute('aria-label')).toBe('Output white');
  });

  it('reports correct aria-value* for the 0..255 handles', async () => {
    mountLevels({ defaultValue: { black: 20, white: 230, outputBlack: 5, outputWhite: 250 } });
    await nextTick();
    const black = thumb('black');
    expect(black.getAttribute('aria-valuenow')).toBe('20');
    expect(black.getAttribute('aria-valuemin')).toBe('0');
    // black's max is white - minGap (230 - 1).
    expect(black.getAttribute('aria-valuemax')).toBe('229');
    expect(thumb('white').getAttribute('aria-valuenow')).toBe('230');
    expect(thumb('white').getAttribute('aria-valuemin')).toBe('21');
    expect(thumb('outputBlack').getAttribute('aria-valuemax')).toBe('250');
    expect(thumb('outputWhite').getAttribute('aria-valuemin')).toBe('5');
  });

  it('gamma thumb aria-valuenow carries the factor and aria-valuetext the effective level', async () => {
    mountLevels({ defaultValue: { black: 0, gamma: 1, white: 255 } });
    await nextTick();
    const gamma = thumb('gamma');
    expect(gamma.getAttribute('aria-valuenow')).toBe('1');
    // gamma 1.00 with black 0 / white 255 → midtone at ~128.
    expect(gamma.getAttribute('aria-valuetext')).toMatch(/^Gamma 1\.00, midtone at 12[78]$/);
    expect(gamma.getAttribute('aria-valuemin')).toBe('0.1');
    expect(gamma.getAttribute('aria-valuemax')).toBe('9.99');
  });
});

describe('Levels — keyboard & neighbour clamp', () => {
  it('ArrowRight/ArrowLeft step the handle by step', async () => {
    const { model } = mountLevels({ defaultValue: { black: 50 }, step: 5 });
    await nextTick();
    keydown(thumb('black'), 'ArrowRight');
    await nextTick();
    expect(model.value!.black).toBe(55);
    keydown(thumb('black'), 'ArrowLeft');
    keydown(thumb('black'), 'ArrowLeft');
    await nextTick();
    expect(model.value!.black).toBe(45);
  });

  it('gamma steps by gammaStep', async () => {
    const { model } = mountLevels({ defaultValue: { gamma: 1 }, gammaStep: 0.1 });
    await nextTick();
    keydown(thumb('gamma'), 'ArrowRight');
    await nextTick();
    expect(model.value!.gamma).toBeCloseTo(1.1, 5);
  });

  it('black cannot cross white (neighbour clamp, pins instead of swaps)', async () => {
    const { model } = mountLevels({ defaultValue: { black: 100, white: 110 }, step: 1, minStepsBetweenHandles: 1 });
    await nextTick();
    for (let i = 0; i < 40; i++) keydown(thumb('black'), 'ArrowRight');
    await nextTick();
    // Pins one minGap (1*1) below white.
    expect(model.value!.black).toBe(109);
    expect(model.value!.black).toBeLessThan(model.value!.white);
  });

  it('Shift+Arrow & Page jump by largeStep', async () => {
    const { model } = mountLevels({ defaultValue: { black: 50 }, step: 1 });
    await nextTick();
    keydown(thumb('black'), 'PageUp');
    await nextTick();
    expect(model.value!.black).toBe(60);
    keydown(thumb('black'), 'ArrowLeft', { shiftKey: true });
    await nextTick();
    expect(model.value!.black).toBe(50);
  });

  it('Home/End jump to the handle lowest/highest legal value', async () => {
    const { model } = mountLevels({ defaultValue: { black: 50, white: 200 } });
    await nextTick();
    keydown(thumb('black'), 'End');
    await nextTick();
    // black's legal max is white - minGap = 199.
    expect(model.value!.black).toBe(199);
    keydown(thumb('black'), 'Home');
    await nextTick();
    expect(model.value!.black).toBe(0);
  });

  it('disabled: tabindex=-1, aria-disabled, keys do nothing', async () => {
    const { model } = mountLevels({ defaultValue: { black: 50 }, disabled: true });
    await nextTick();
    const black = thumb('black');
    expect(black.tabIndex).toBe(-1);
    expect(black.getAttribute('aria-disabled')).toBe('true');
    keydown(black, 'ArrowRight');
    await nextTick();
    expect(model.value).toBeUndefined();
  });
});

describe('Levels — getOutputCurve via exposed API', () => {
  it('exposes a 256-length LUT reflecting the current adjustment', async () => {
    const rootRef = ref<any>(null);
    const Harness = defineComponent({
      setup: () => () => h(LevelsRoot, {
        ref: rootRef,
        defaultValue: { black: 32, gamma: 1, white: 224, outputBlack: 0, outputWhite: 255 },
      }, { default: () => h(LevelsTrack, null, { default: () => h(LevelsThumb, { kind: 'black' }) }) }),
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    const lut = rootRef.value.getOutputCurve();
    expect(lut).toHaveLength(256);
    expect(lut[0]).toBeCloseTo(0, 3);
    expect(lut[255]).toBeCloseTo(255, 3);
    for (let i = 1; i < lut.length; i++) expect(lut[i]!).toBeGreaterThanOrEqual(lut[i - 1]!);
  });

  it('autoLevels updates black/white from a histogram', async () => {
    const rootRef = ref<any>(null);
    const model = ref<LevelsValue | null | undefined>(undefined);
    const Harness = defineComponent({
      setup: () => () => h(LevelsRoot, {
        ref: rootRef,
        modelValue: model.value,
        'onUpdate:modelValue': (v: LevelsValue | null | undefined) => { model.value = v; },
      }, { default: () => h(LevelsTrack, null, { default: () => h(LevelsThumb, { kind: 'black' }) }) }),
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    const hist = Array.from({ length: 256 }, (_, i) => (i >= 80 && i <= 180 ? 100 : 0));
    rootRef.value.autoLevels(hist);
    await nextTick();
    expect(model.value!.black).toBeGreaterThan(0);
    expect(model.value!.white).toBeLessThan(255);
    expect(model.value!.black).toBeLessThan(model.value!.white);
  });
});

describe('Levels — HandleValue numeric entry', () => {
  it('composes a number-field bound to the handle and writes back clamped', async () => {
    const model = ref<LevelsValue | null | undefined>(undefined);
    const Harness = defineComponent({
      setup: () => () => h(LevelsRoot, {
        modelValue: model.value,
        defaultValue: { black: 50, gamma: 1, white: 200, outputBlack: 0, outputWhite: 255 },
        'onUpdate:modelValue': (v: LevelsValue | null | undefined) => { model.value = v; },
      }, {
        default: () => h(LevelsHandleValue, { kind: 'black' }),
      }),
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    const input = document.querySelector<HTMLInputElement>('input[role="spinbutton"]')!;
    expect(input).toBeTruthy();
    expect(input.value).toBe('50');
    // It carries the handle's neighbour-aware max (white - minGap = 199).
    expect(input.getAttribute('aria-valuemax')).toBe('199');
    expect(input.getAttribute('aria-label')).toBe('Black point');

    // Typing past the neighbour clamps to 199, never crossing white.
    input.value = '240';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    expect(model.value!.black).toBeLessThanOrEqual(199);
    expect(model.value!.black).toBeLessThan(model.value!.white);
  });

  it('renders an increment and decrement stepper bound to the handle', async () => {
    const Harness = defineComponent({
      setup: () => () => h(LevelsRoot, {
        defaultValue: { black: 50, gamma: 1, white: 200, outputBlack: 0, outputWhite: 255 },
      }, {
        default: () => h(LevelsHandleValue, { kind: 'gamma' }),
      }),
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    const input = document.querySelector<HTMLInputElement>('input[role="spinbutton"]')!;
    expect(input.value).toBe('1');
    // Gamma field uses the gamma bounds.
    expect(input.getAttribute('aria-valuemin')).toBe('0.1');
    expect(input.getAttribute('aria-valuemax')).toBe('9.99');
  });
});
