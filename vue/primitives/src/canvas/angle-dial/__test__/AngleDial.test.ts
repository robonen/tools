import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { AngleDialRoot, AngleDialThumb } from '../index';
import {
  angleToHue,
  angleToPoint,
  circularDistance,
  normalizeDeg,
  pointToAngle,
  shortestDelta,
} from '../utils';

const wrappers: Array<VueWrapper<any>> = [];

afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
});

function track<T extends VueWrapper<any>>(w: T): T {
  wrappers.push(w);
  return w;
}

type RootOpts = Partial<{
  min: number;
  max: number;
  step: number;
  largeStep: number;
  wrap: 'wrap' | 'clamp';
  snap: number | number[];
  disabled: boolean;
  defaultValue: number;
}>;

function mountDial(opts: RootOpts = {}, thumbProps: Record<string, unknown> = {}) {
  const model = ref<number | undefined>(undefined);
  const Harness = defineComponent({
    setup() {
      return () => h(AngleDialRoot, {
        value: model.value,
        'onUpdate:value': (v: number | null | undefined) => { model.value = v ?? undefined; },
        ...opts,
      }, {
        default: () => h(AngleDialThumb, thumbProps),
      });
    },
  });
  const w = track(mount(Harness, { attachTo: document.body }));
  return { wrapper: w, model };
}

function keydown(el: Element, key: string, opts: { shiftKey?: boolean } = {}): void {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, shiftKey: opts.shiftKey ?? false });
  el.dispatchEvent(event);
}

function thumbEl(): HTMLElement {
  return document.querySelector<HTMLElement>('[role="slider"]')!;
}

describe('AngleDialThumb — ARIA', () => {
  it('role="slider" with aria-valuemin/max/now and NO aria-orientation', async () => {
    mountDial({ defaultValue: 45, min: 0, max: 360 });
    await nextTick();
    const thumb = thumbEl();
    expect(thumb).toBeTruthy();
    expect(thumb.getAttribute('role')).toBe('slider');
    expect(thumb.getAttribute('aria-valuemin')).toBe('0');
    expect(thumb.getAttribute('aria-valuemax')).toBe('360');
    expect(thumb.getAttribute('aria-valuenow')).toBe('45');
    // A radial control has no axis — aria-orientation must be absent.
    expect(thumb.getAttribute('aria-orientation')).toBeNull();
    expect(thumb.tabIndex).toBe(0);
  });

  it('aria-valuetext defaults to "<n>°"', async () => {
    mountDial({ defaultValue: 45 });
    await nextTick();
    expect(thumbEl().getAttribute('aria-valuetext')).toBe('45°');
  });

  it('rounds the default valuetext degrees', async () => {
    mountDial({ defaultValue: 33.6, step: 0.1 });
    await nextTick();
    expect(thumbEl().getAttribute('aria-valuetext')).toBe('34°');
  });

  it('a custom valueText formatter overrides the default', async () => {
    mountDial({ defaultValue: 90 }, { valueText: (deg: number) => `${deg} degrees` });
    await nextTick();
    expect(thumbEl().getAttribute('aria-valuetext')).toBe('90 degrees');
  });

  it('an explicit aria-valuetext attr wins over the formatter', async () => {
    mountDial({ defaultValue: 90 }, { 'aria-valuetext': 'east' });
    await nextTick();
    expect(thumbEl().getAttribute('aria-valuetext')).toBe('east');
  });

  it('defaults aria-label to "Angle" and lets an explicit label win', async () => {
    mountDial({ defaultValue: 0 });
    await nextTick();
    expect(thumbEl().getAttribute('aria-label')).toBe('Angle');
    document.body.innerHTML = '';
    while (wrappers.length) wrappers.pop()!.unmount();
    mountDial({ defaultValue: 0 }, { 'aria-label': 'Hue' });
    await nextTick();
    expect(thumbEl().getAttribute('aria-label')).toBe('Hue');
  });
});

describe('AngleDialThumb — keyboard', () => {
  it('ArrowRight increments by step, ArrowLeft decrements', async () => {
    const { model } = mountDial({ defaultValue: 50, step: 5, wrap: 'clamp' });
    await nextTick();
    const thumb = thumbEl();
    keydown(thumb, 'ArrowRight');
    await nextTick();
    expect(model.value).toBe(55);
    keydown(thumb, 'ArrowLeft');
    keydown(thumb, 'ArrowLeft');
    await nextTick();
    expect(model.value).toBe(45);
  });

  it('ArrowUp increments, ArrowDown decrements', async () => {
    const { model } = mountDial({ defaultValue: 50, step: 5, wrap: 'clamp' });
    await nextTick();
    const thumb = thumbEl();
    keydown(thumb, 'ArrowUp');
    await nextTick();
    expect(model.value).toBe(55);
    keydown(thumb, 'ArrowDown');
    await nextTick();
    expect(model.value).toBe(50);
  });

  it('Shift+Arrow jumps by largeStep', async () => {
    const { model } = mountDial({ defaultValue: 100, step: 1, largeStep: 15, wrap: 'clamp' });
    await nextTick();
    const thumb = thumbEl();
    keydown(thumb, 'ArrowRight', { shiftKey: true });
    await nextTick();
    expect(model.value).toBe(115);
    keydown(thumb, 'ArrowLeft', { shiftKey: true });
    await nextTick();
    expect(model.value).toBe(100);
  });

  it('PageUp / PageDown jump by largeStep', async () => {
    const { model } = mountDial({ defaultValue: 100, step: 1, largeStep: 15, wrap: 'clamp' });
    await nextTick();
    const thumb = thumbEl();
    keydown(thumb, 'PageUp');
    await nextTick();
    expect(model.value).toBe(115);
    keydown(thumb, 'PageDown');
    keydown(thumb, 'PageDown');
    await nextTick();
    expect(model.value).toBe(85);
  });

  it('Home/End jump to the bounds (clamp mode)', async () => {
    const { model } = mountDial({ defaultValue: 90, min: 0, max: 270, step: 1, wrap: 'clamp' });
    await nextTick();
    const thumb = thumbEl();
    keydown(thumb, 'Home');
    await nextTick();
    expect(model.value).toBe(0);
    keydown(thumb, 'End');
    await nextTick();
    expect(model.value).toBe(270);
  });

  it('Home goes to the seam start and End just before the seam (wrap mode)', async () => {
    const { model } = mountDial({ defaultValue: 90, min: 0, max: 360, step: 1, wrap: 'wrap' });
    await nextTick();
    const thumb = thumbEl();
    keydown(thumb, 'Home');
    await nextTick();
    expect(model.value).toBe(0);
    keydown(thumb, 'End');
    await nextTick();
    // max (360) folds back to 0 in wrap mode, so End lands just before the seam.
    expect(model.value).toBe(359);
  });

  it('disabled: tabindex=-1, aria-disabled, keys do nothing', async () => {
    const { model } = mountDial({ defaultValue: 50, disabled: true });
    await nextTick();
    const thumb = thumbEl();
    expect(thumb.tabIndex).toBe(-1);
    expect(thumb.getAttribute('aria-disabled')).toBe('true');
    keydown(thumb, 'ArrowRight');
    await nextTick();
    expect(model.value).toBeUndefined();
  });

  it('preventDefault is called on handled keys', async () => {
    mountDial({ defaultValue: 50, wrap: 'clamp' });
    await nextTick();
    const thumb = thumbEl();
    const ev = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    thumb.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
  });
});

describe('AngleDialRoot — seam handling', () => {
  it('wrap mode crosses the 0/360 seam forward without jumping backwards', async () => {
    const { model } = mountDial({ defaultValue: 359, min: 0, max: 360, step: 1, largeStep: 5, wrap: 'wrap' });
    await nextTick();
    const thumb = thumbEl();
    // 359 + 5 (large) should land at 4 (wrapped through 0), not 354.
    keydown(thumb, 'PageUp');
    await nextTick();
    expect(model.value).toBe(4);
  });

  it('wrap mode crosses the seam backward (0 → 355)', async () => {
    const { model } = mountDial({ defaultValue: 0, min: 0, max: 360, step: 1, largeStep: 5, wrap: 'wrap' });
    await nextTick();
    const thumb = thumbEl();
    keydown(thumb, 'PageDown');
    await nextTick();
    expect(model.value).toBe(355);
  });

  it('clamp mode bounds at the arc ends instead of wrapping', async () => {
    const { model } = mountDial({ defaultValue: 355, min: 0, max: 360, step: 1, largeStep: 15, wrap: 'clamp' });
    await nextTick();
    const thumb = thumbEl();
    keydown(thumb, 'PageUp');
    await nextTick();
    expect(model.value).toBe(360);
    // Pushing further stays clamped.
    keydown(thumb, 'ArrowRight');
    await nextTick();
    expect(model.value).toBe(360);
  });

  it('clamp mode bounds at the low end', async () => {
    const { model } = mountDial({ defaultValue: 5, min: 0, max: 360, step: 1, largeStep: 15, wrap: 'clamp' });
    await nextTick();
    const thumb = thumbEl();
    keydown(thumb, 'PageDown');
    await nextTick();
    expect(model.value).toBe(0);
  });
});

describe('AngleDialRoot — snap', () => {
  it('a snapped keyboard nudge advances to the next snap target', async () => {
    const { model } = mountDial({ defaultValue: 0, step: 1, snap: 15, wrap: 'clamp' });
    await nextTick();
    const thumb = thumbEl();
    // From a snap point, one ArrowRight steps to the next reachable snap target
    // (15) instead of freezing at 0 (snap is coarser than step).
    keydown(thumb, 'ArrowRight');
    await nextTick();
    expect(model.value).toBe(15);
    keydown(thumb, 'ArrowRight');
    await nextTick();
    expect(model.value).toBe(30);
    keydown(thumb, 'ArrowLeft');
    await nextTick();
    expect(model.value).toBe(15);
  });
});

describe('AngleDialRoot — pointer drag', () => {
  function rootEl(): HTMLElement {
    // The root is the AngleDialRoot's rendered element (the dial container).
    return document.querySelector<HTMLElement>('[role="slider"]')!.parentElement!;
  }

  function sizeRoot(el: HTMLElement): { cx: number; cy: number } {
    el.style.position = 'fixed';
    el.style.left = '0px';
    el.style.top = '0px';
    el.style.width = '200px';
    el.style.height = '200px';
    const rect = el.getBoundingClientRect();
    return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 };
  }

  function pointer(el: HTMLElement, type: string, x: number, y: number): void {
    const ev = new PointerEvent(type, {
      pointerId: 1,
      button: 0,
      clientX: x,
      clientY: y,
      bubbles: true,
      cancelable: true,
    });
    el.dispatchEvent(ev);
  }

  it('pressing to the right of center sets the value to ~90° (0=up, clockwise)', async () => {
    const { model } = mountDial({ defaultValue: 0, min: 0, max: 360, step: 1, wrap: 'wrap' });
    await nextTick();
    const root = rootEl();
    const { cx, cy } = sizeRoot(root);
    // A point straight to the right of center.
    pointer(root, 'pointerdown', cx + 50, cy);
    pointer(root, 'pointerup', cx + 50, cy);
    await nextTick();
    expect(model.value).toBe(90);
  });

  it('pressing below center sets the value to ~180°', async () => {
    const { model } = mountDial({ defaultValue: 0, min: 0, max: 360, step: 1, wrap: 'wrap' });
    await nextTick();
    const root = rootEl();
    const { cx, cy } = sizeRoot(root);
    pointer(root, 'pointerdown', cx, cy + 50);
    pointer(root, 'pointerup', cx, cy + 50);
    await nextTick();
    expect(model.value).toBe(180);
  });

  it('a press exactly at center is ignored (no angle)', async () => {
    const { model } = mountDial({ defaultValue: 42, min: 0, max: 360, step: 1, wrap: 'wrap' });
    await nextTick();
    const root = rootEl();
    const { cx, cy } = sizeRoot(root);
    pointer(root, 'pointerdown', cx, cy);
    pointer(root, 'pointerup', cx, cy);
    await nextTick();
    expect(model.value).toBeUndefined();
  });

  it('emits valueCommit on pointerup', async () => {
    const committed: number[] = [];
    const model = ref<number | undefined>(undefined);
    const Harness = defineComponent({
      setup: () => () => h(AngleDialRoot, {
        value: model.value,
        wrap: 'wrap',
        'onUpdate:value': (v: number | null | undefined) => { model.value = v ?? undefined; },
        onValueCommit: (v: number) => committed.push(v),
      }, { default: () => h(AngleDialThumb) }),
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    const root = document.querySelector<HTMLElement>('[role="slider"]')!.parentElement!;
    const { cx, cy } = sizeRoot(root);
    pointer(root, 'pointerdown', cx + 50, cy);
    pointer(root, 'pointerup', cx + 50, cy);
    await nextTick();
    expect(committed).toContain(90);
  });
});

describe('utils — polar math', () => {
  const center = { x: 0, y: 0 };

  it('pointToAngle: up = 0°', () => {
    // Screen y grows downward, so "up" is negative y.
    expect(pointToAngle({ x: 0, y: -10 }, center)).toBeCloseTo(0);
  });

  it('pointToAngle: right = 90°', () => {
    expect(pointToAngle({ x: 10, y: 0 }, center)).toBeCloseTo(90);
  });

  it('pointToAngle: down = 180°', () => {
    expect(pointToAngle({ x: 0, y: 10 }, center)).toBeCloseTo(180);
  });

  it('pointToAngle: left = 270°', () => {
    expect(pointToAngle({ x: -10, y: 0 }, center)).toBeCloseTo(270);
  });

  it('angleToPoint is the inverse of pointToAngle for cardinals', () => {
    for (const deg of [0, 90, 180, 270]) {
      const p = angleToPoint(deg, 10, center);
      expect(pointToAngle(p, center)).toBeCloseTo(deg);
    }
  });

  it('angleToPoint: 0° is straight up (negative y)', () => {
    const p = angleToPoint(0, 10, center);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(-10);
  });

  it('angleToPoint: 90° is to the right (positive x)', () => {
    const p = angleToPoint(90, 10, center);
    expect(p.x).toBeCloseTo(10);
    expect(p.y).toBeCloseTo(0);
  });

  it('normalizeDeg folds into [0, 360)', () => {
    expect(normalizeDeg(370)).toBe(10);
    expect(normalizeDeg(-10)).toBe(350);
    expect(normalizeDeg(0)).toBe(0);
    expect(normalizeDeg(360)).toBe(0);
  });

  it('shortestDelta picks the seam-crossing direction', () => {
    expect(shortestDelta(350, 10)).toBeCloseTo(20);
    expect(shortestDelta(10, 350)).toBeCloseTo(-20);
    expect(shortestDelta(0, 90)).toBeCloseTo(90);
    expect(shortestDelta(0, 180)).toBeCloseTo(180);
  });

  it('circularDistance is the shortest arc', () => {
    expect(circularDistance(350, 10)).toBeCloseTo(20);
    expect(circularDistance(0, 180)).toBeCloseTo(180);
    expect(circularDistance(10, 350)).toBeCloseTo(20);
  });

  it('angleToHue produces an hsl string from the wrapped angle', () => {
    expect(angleToHue(0)).toBe('hsl(0, 100%, 50%)');
    expect(angleToHue(120)).toBe('hsl(120, 100%, 50%)');
    expect(angleToHue(370)).toBe('hsl(10, 100%, 50%)');
    expect(angleToHue(120, 80, 40)).toBe('hsl(120, 80%, 40%)');
  });
});
