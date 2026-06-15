import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import type { HSVA } from '../../../internal/color';
import { ColorAreaRoot, ColorAreaThumb } from '../index';

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
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, shiftKey: opts.shiftKey ?? false }));
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function mountArea(opts: Partial<{ defaultValue: HSVA; step: number; largeStep: number; disabled: boolean }> = {}, thumbProps: Record<string, unknown> = {}) {
  const model = ref<HSVA | undefined>(undefined);
  const Harness = defineComponent({
    setup: () => () => h(ColorAreaRoot, {
      modelValue: model.value,
      'onUpdate:modelValue': (v: HSVA | null | undefined) => { model.value = v ?? undefined; },
      ...opts,
    }, { default: () => h(ColorAreaThumb, thumbProps) }),
  });
  const w = track(mount(Harness, { attachTo: document.body }));
  return { wrapper: w, model };
}

describe('ColorArea', () => {
  it('thumb is role=slider with aria-valuetext conveying both axes', async () => {
    mountArea({ defaultValue: { h: 0, s: 0.6, v: 0.8, a: 1 } });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    expect(thumb).toBeTruthy();
    // aria-valuenow carries the primary axis (brightness).
    expect(thumb.getAttribute('aria-valuenow')).toBe('80');
    expect(thumb.getAttribute('aria-valuetext')).toBe('Saturation 60%, Brightness 80%');
    expect(thumb.getAttribute('aria-label')).toBe('Saturation and brightness');
    expect(thumb.tabIndex).toBe(0);
  });

  it('positions the thumb at left=s, top=1-v', async () => {
    mountArea({ defaultValue: { h: 0, s: 0.25, v: 0.75, a: 1 } });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    expect(thumb.style.left).toBe('25%');
    expect(thumb.style.top).toBe('25%');
  });

  it('ArrowRight / ArrowLeft change saturation by step', async () => {
    const { model } = mountArea({ defaultValue: { h: 0, s: 0.5, v: 0.5, a: 1 }, step: 0.1 });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    keydown(thumb, 'ArrowRight');
    await nextTick();
    expect(round(model.value!.s)).toBe(0.6);
    keydown(thumb, 'ArrowLeft');
    keydown(thumb, 'ArrowLeft');
    await nextTick();
    expect(round(model.value!.s)).toBe(0.4);
  });

  it('ArrowUp increases brightness, ArrowDown decreases', async () => {
    const { model } = mountArea({ defaultValue: { h: 0, s: 0.5, v: 0.5, a: 1 }, step: 0.1 });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    keydown(thumb, 'ArrowUp');
    await nextTick();
    expect(round(model.value!.v)).toBe(0.6);
    keydown(thumb, 'ArrowDown');
    keydown(thumb, 'ArrowDown');
    await nextTick();
    expect(round(model.value!.v)).toBe(0.4);
  });

  it('Shift+Arrow uses the large step', async () => {
    const { model } = mountArea({ defaultValue: { h: 0, s: 0.5, v: 0.5, a: 1 }, step: 0.01, largeStep: 0.1 });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    keydown(thumb, 'ArrowRight', { shiftKey: true });
    await nextTick();
    expect(round(model.value!.s)).toBe(0.6);
  });

  it('Home / End set saturation to 0 / 1', async () => {
    const { model } = mountArea({ defaultValue: { h: 30, s: 0.5, v: 0.5, a: 1 } });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    keydown(thumb, 'Home');
    await nextTick();
    expect(model.value!.s).toBe(0);
    keydown(thumb, 'End');
    await nextTick();
    expect(model.value!.s).toBe(1);
  });

  it('PageUp / PageDown change brightness by the large step', async () => {
    const { model } = mountArea({ defaultValue: { h: 0, s: 0.5, v: 0.5, a: 1 }, largeStep: 0.2 });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    keydown(thumb, 'PageUp');
    await nextTick();
    expect(round(model.value!.v)).toBe(0.7);
    keydown(thumb, 'PageDown');
    keydown(thumb, 'PageDown');
    await nextTick();
    expect(round(model.value!.v)).toBe(0.3);
  });

  it('clamps saturation / value within [0, 1]', async () => {
    const { model } = mountArea({ defaultValue: { h: 0, s: 0.95, v: 0.05, a: 1 }, step: 0.1 });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    keydown(thumb, 'ArrowRight');
    keydown(thumb, 'ArrowDown');
    await nextTick();
    expect(model.value!.s).toBe(1);
    expect(model.value!.v).toBe(0);
  });

  it('preserve-hue at s=0: dragging into and back out keeps the hue', async () => {
    const { model } = mountArea({ defaultValue: { h: 200, s: 0.5, v: 0.5, a: 1 } });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    // Collapse saturation to 0 (grey — hue becomes ambiguous).
    keydown(thumb, 'Home');
    await nextTick();
    expect(model.value!.s).toBe(0);
    expect(model.value!.h).toBe(200);
    // Restore saturation; the original hue must come back.
    keydown(thumb, 'End');
    await nextTick();
    expect(model.value!.s).toBe(1);
    expect(model.value!.h).toBe(200);
  });

  it('valueText prop overrides the announced text', async () => {
    mountArea(
      { defaultValue: { h: 0, s: 0.5, v: 0.5, a: 1 } },
      { valueText: (s: number, v: number) => `S${Math.round(s * 100)}/V${Math.round(v * 100)}` },
    );
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    expect(thumb.getAttribute('aria-valuetext')).toBe('S50/V50');
  });

  it('disabled: tabindex=-1 and keys do nothing', async () => {
    const { model } = mountArea({ defaultValue: { h: 0, s: 0.5, v: 0.5, a: 1 }, disabled: true });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    expect(thumb.tabIndex).toBe(-1);
    keydown(thumb, 'ArrowRight');
    await nextTick();
    expect(model.value).toBeUndefined();
  });
});
