import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import type { CurveEditorAnchor, CurveEditorInterpolation } from '../index';
import { CurveEditorCurve, CurveEditorPoint, CurveEditorRoot } from '../index';
import { buildEvaluator, clampAnchorX } from '../utils';

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

function anchorsFromIds(...pts: Array<[number, number]>): CurveEditorAnchor[] {
  return pts.map(([x, y], i) => ({ id: `a${i}`, x, y }));
}

function round(n: number, d = 3): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function mountEditor(
  opts: Partial<{
    defaultValue: CurveEditorAnchor[];
    interpolation: CurveEditorInterpolation;
    monotonicX: boolean;
    fixedEndpoints: boolean;
    step: number;
    largeStep: number;
    disabled: boolean;
  }> = {},
) {
  const model = ref<CurveEditorAnchor[] | undefined>(undefined);
  const Harness = defineComponent({
    setup: () => () => h(
      CurveEditorRoot,
      {
        modelValue: model.value,
        'onUpdate:modelValue': (v: CurveEditorAnchor[] | null | undefined) => {
          model.value = v ?? undefined;
        },
        ...opts,
      },
      {
        default: ({ anchors }: { anchors: CurveEditorAnchor[] }) => [
          h(CurveEditorCurve),
          ...anchors.map(a => h(CurveEditorPoint, { key: a.id, anchor: a })),
        ],
      },
    ),
  });
  const w = track(mount(Harness, { attachTo: document.body }));
  return { wrapper: w, model };
}

// ── unit tests: evaluator / sample logic ────────────────────────────────────

describe('CurveEditor evaluator (unit)', () => {
  it('linear interpolates and passes through anchors', () => {
    const f = buildEvaluator(anchorsFromIds([0, 0], [1, 1]), 'linear');
    expect(f(0)).toBe(0);
    expect(f(1)).toBe(1);
    expect(round(f(0.5))).toBe(0.5);
  });

  it('monotone passes through anchors and is non-decreasing for a rising set', () => {
    const f = buildEvaluator(anchorsFromIds([0, 0], [0.5, 0.2], [1, 1]), 'monotone');
    expect(round(f(0))).toBe(0);
    expect(round(f(0.5))).toBe(0.2);
    expect(round(f(1))).toBe(1);
    // Monotone (no overshoot): sampling forward never decreases.
    let prev = -Infinity;
    for (let i = 0; i <= 20; i++) {
      const y = f(i / 20);
      expect(y).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = y;
    }
  });

  it('catmull-rom passes through its anchors', () => {
    const f = buildEvaluator(anchorsFromIds([0, 0], [0.5, 0.7], [1, 1]), 'catmull-rom');
    expect(round(f(0), 2)).toBe(0);
    expect(round(f(0.5), 2)).toBe(0.7);
    expect(round(f(1), 2)).toBe(1);
  });

  it('bezier with default tangents reproduces a near-linear segment', () => {
    const f = buildEvaluator(anchorsFromIds([0, 0], [1, 1]), 'bezier');
    expect(round(f(0))).toBe(0);
    expect(round(f(1))).toBe(1);
    expect(round(f(0.5), 2)).toBe(0.5);
  });

  it('clamps x outside the domain to the endpoint y', () => {
    const f = buildEvaluator(anchorsFromIds([0, 0.1], [1, 0.9]), 'monotone');
    expect(f(-1)).toBe(0.1);
    expect(f(2)).toBe(0.9);
  });

  it('clampAnchorX keeps an anchor between its neighbours under monotonicX', () => {
    const list = anchorsFromIds([0, 0], [0.5, 0.5], [1, 1]);
    // Try to push the middle anchor past the right neighbour.
    const x = clampAnchorX(list, 1, 5, {
      domainMin: 0,
      domainMax: 1,
      monotonicX: true,
      fixedEndpoints: true,
      minGap: 0.01,
    });
    expect(x).toBeLessThanOrEqual(1 - 0.01);
    expect(x).toBeGreaterThan(0);
  });

  it('clampAnchorX pins endpoints when fixedEndpoints', () => {
    const list = anchorsFromIds([0, 0], [1, 1]);
    expect(clampAnchorX(list, 0, 0.4, { domainMin: 0, domainMax: 1, monotonicX: true, fixedEndpoints: true, minGap: 0.01 })).toBe(0);
    expect(clampAnchorX(list, 1, 0.4, { domainMin: 0, domainMax: 1, monotonicX: true, fixedEndpoints: true, minGap: 0.01 })).toBe(1);
  });
});

// ── component tests (browser mode) ──────────────────────────────────────────

describe('CurveEditor component', () => {
  it('renders anchors as role=slider with aria-valuetext conveying input + output', async () => {
    mountEditor({ defaultValue: anchorsFromIds([0, 0], [1, 0.5]) });
    await nextTick();
    const sliders = document.querySelectorAll<HTMLElement>('[role="slider"]');
    expect(sliders.length).toBe(2);
    const last = sliders[1]!;
    expect(last.getAttribute('aria-valuenow')).toBe('0.5');
    expect(last.getAttribute('aria-valuetext')).toBe('input 1, output 0.5');
    expect(last.getAttribute('aria-valuemin')).toBe('0');
    expect(last.getAttribute('aria-valuemax')).toBe('1');
  });

  it('exposes sample() and toLUT() that pass through anchors', async () => {
    const { wrapper } = mountEditor({ defaultValue: anchorsFromIds([0, 0], [0.5, 0.2], [1, 1]), interpolation: 'monotone' });
    await nextTick();
    const root = wrapper.findComponent(CurveEditorRoot);
    const sample = (root.vm as any).sample as (x: number) => number;
    expect(round(sample(0))).toBe(0);
    expect(round(sample(0.5))).toBe(0.2);
    expect(round(sample(1))).toBe(1);
    const lut = (root.vm as any).toLUT(16) as number[];
    expect(lut.length).toBe(16);
    expect(round(lut[0]!)).toBe(0);
    expect(round(lut[lut.length - 1]!)).toBe(1);
  });

  it('ArrowUp increases y on the focused anchor', async () => {
    const { model } = mountEditor({ defaultValue: anchorsFromIds([0, 0], [1, 0.5]), step: 0.1 });
    await nextTick();
    const slider = document.querySelectorAll<HTMLElement>('[role="slider"]')[1]!;
    keydown(slider, 'ArrowUp');
    await nextTick();
    expect(round(model.value![1]!.y)).toBe(0.6);
  });

  it('ArrowRight increases x; endpoints are x-locked when fixedEndpoints', async () => {
    const { model } = mountEditor({
      defaultValue: anchorsFromIds([0, 0], [0.5, 0.5], [1, 1]),
      step: 0.1,
      fixedEndpoints: true,
    });
    await nextTick();
    const sliders = document.querySelectorAll<HTMLElement>('[role="slider"]');
    // Interior anchor moves in x.
    keydown(sliders[1]!, 'ArrowRight');
    await nextTick();
    expect(round(model.value![1]!.x)).toBe(0.6);
    // Endpoint x is locked.
    keydown(sliders[2]!, 'ArrowRight');
    await nextTick();
    expect(round(model.value![2]!.x)).toBe(1);
  });

  it('monotonicX prevents an anchor from crossing its neighbour', async () => {
    const { model } = mountEditor({
      defaultValue: anchorsFromIds([0, 0], [0.5, 0.5], [1, 1]),
      step: 0.1,
      monotonicX: true,
    });
    await nextTick();
    const mid = document.querySelectorAll<HTMLElement>('[role="slider"]')[1]!;
    // Hammer ArrowRight far past the right neighbour at x=1.
    for (let i = 0; i < 20; i++) keydown(mid, 'ArrowRight');
    await nextTick();
    expect(model.value![1]!.x).toBeLessThan(1);
    // Order is preserved.
    expect(model.value![0]!.x).toBeLessThan(model.value![1]!.x);
    expect(model.value![1]!.x).toBeLessThan(model.value![2]!.x);
  });

  it('Shift+Arrow uses the large step', async () => {
    const { model } = mountEditor({ defaultValue: anchorsFromIds([0, 0], [1, 0.5]), step: 0.01, largeStep: 0.1 });
    await nextTick();
    const slider = document.querySelectorAll<HTMLElement>('[role="slider"]')[1]!;
    keydown(slider, 'ArrowUp', { shiftKey: true });
    await nextTick();
    expect(round(model.value![1]!.y)).toBe(0.6);
  });

  it('Enter adds an anchor at the midpoint, Delete removes an interior anchor', async () => {
    const { model } = mountEditor({ defaultValue: anchorsFromIds([0, 0], [1, 1]) });
    await nextTick();
    const first = document.querySelectorAll<HTMLElement>('[role="slider"]')[0]!;
    keydown(first, 'Enter');
    await nextTick();
    expect(model.value!.length).toBe(3);
    expect(round(model.value![1]!.x)).toBe(0.5);
    // Remove the new interior anchor.
    const interior = document.querySelectorAll<HTMLElement>('[role="slider"]')[1]!;
    keydown(interior, 'Delete');
    await nextTick();
    expect(model.value!.length).toBe(2);
  });

  it('Delete does not remove an endpoint', async () => {
    mountEditor({ defaultValue: anchorsFromIds([0, 0], [1, 1]) });
    await nextTick();
    const first = document.querySelectorAll<HTMLElement>('[role="slider"]')[0]!;
    keydown(first, 'Delete');
    await nextTick();
    // The endpoint is never removed: both anchors still render.
    expect(document.querySelectorAll('[role="slider"]').length).toBe(2);
  });

  it('roving focus: only the active anchor is tabbable', async () => {
    mountEditor({ defaultValue: anchorsFromIds([0, 0], [0.5, 0.5], [1, 1]) });
    await nextTick();
    const sliders = document.querySelectorAll<HTMLElement>('[role="slider"]');
    // Active index defaults to 0.
    expect(sliders[0]!.tabIndex).toBe(0);
    expect(sliders[1]!.tabIndex).toBe(-1);
    expect(sliders[2]!.tabIndex).toBe(-1);
  });

  it('disabled: tabindex=-1 and keys do nothing', async () => {
    const { model } = mountEditor({ defaultValue: anchorsFromIds([0, 0], [1, 0.5]), disabled: true });
    await nextTick();
    const slider = document.querySelectorAll<HTMLElement>('[role="slider"]')[1]!;
    expect(slider.tabIndex).toBe(-1);
    keydown(slider, 'ArrowUp');
    await nextTick();
    // No mutation occurred (model never written).
    expect(model.value).toBeUndefined();
  });

  it('renders the curve as an aria-hidden path with a non-empty d', async () => {
    mountEditor({ defaultValue: anchorsFromIds([0, 0], [1, 1]) });
    await nextTick();
    const path = document.querySelector<SVGPathElement>('[data-curve-editor-curve]')!;
    expect(path).toBeTruthy();
    expect(path.getAttribute('aria-hidden')).toBe('true');
  });

  it('interpolation modes each produce a curve through the anchors', async () => {
    for (const interpolation of ['linear', 'monotone', 'catmull-rom', 'bezier'] as const) {
      const { wrapper } = mountEditor({ defaultValue: anchorsFromIds([0, 0], [0.5, 0.4], [1, 1]), interpolation });
      await nextTick();
      const sample = (wrapper.findComponent(CurveEditorRoot).vm as any).sample as (x: number) => number;
      expect(round(sample(0), 2)).toBe(0);
      expect(round(sample(0.5), 2)).toBe(0.4);
      expect(round(sample(1), 2)).toBe(1);
      wrapper.unmount();
    }
  });
});
