import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import type { HSVA } from '../../../internal/color';
import { HueSliderRoot, HueSliderThumb } from '../index';

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

function mountHue(opts: Partial<{ defaultValue: HSVA; step: number; disabled: boolean; orientation: 'horizontal' | 'vertical' }> = {}) {
  const model = ref<HSVA | undefined>(undefined);
  const Harness = defineComponent({
    setup: () => () => h(HueSliderRoot, {
      modelValue: model.value,
      'onUpdate:modelValue': (v: HSVA | null | undefined) => { model.value = v ?? undefined; },
      ...opts,
    }, { default: () => h(HueSliderThumb) }),
  });
  const w = track(mount(Harness, { attachTo: document.body }));
  return { wrapper: w, model };
}

describe('HueSlider', () => {
  it('thumb is role=slider with hue aria-value*', async () => {
    mountHue({ defaultValue: { h: 120, s: 1, v: 1, a: 1 } });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    expect(thumb).toBeTruthy();
    expect(thumb.getAttribute('aria-valuemin')).toBe('0');
    expect(thumb.getAttribute('aria-valuemax')).toBe('360');
    expect(thumb.getAttribute('aria-valuenow')).toBe('120');
    expect(thumb.getAttribute('aria-valuetext')).toBe('120°');
    expect(thumb.getAttribute('aria-label')).toBe('Hue');
    expect(thumb.tabIndex).toBe(0);
  });

  it('ArrowRight / ArrowLeft step the hue', async () => {
    const { model } = mountHue({ defaultValue: { h: 100, s: 1, v: 1, a: 1 }, step: 5 });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    keydown(thumb, 'ArrowRight');
    await nextTick();
    expect(model.value!.h).toBe(105);
    keydown(thumb, 'ArrowLeft');
    keydown(thumb, 'ArrowLeft');
    await nextTick();
    expect(model.value!.h).toBe(95);
  });

  it('Shift+Arrow uses the large step', async () => {
    const { model } = mountHue({ defaultValue: { h: 100, s: 1, v: 1, a: 1 }, step: 1 });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    keydown(thumb, 'ArrowRight', { shiftKey: true });
    await nextTick();
    expect(model.value!.h).toBe(110);
  });

  it('Home / End clamp to 0 / 360', async () => {
    const { model } = mountHue({ defaultValue: { h: 180, s: 1, v: 1, a: 1 } });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    keydown(thumb, 'Home');
    await nextTick();
    expect(model.value!.h).toBe(0);
    keydown(thumb, 'End');
    await nextTick();
    expect(model.value!.h).toBe(360);
  });

  it('clamps within [0, 360]', async () => {
    const { model } = mountHue({ defaultValue: { h: 2, s: 1, v: 1, a: 1 }, step: 5 });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    keydown(thumb, 'ArrowLeft');
    await nextTick();
    expect(model.value!.h).toBe(0);
  });

  it('preserves saturation / value / alpha while only changing hue', async () => {
    const { model } = mountHue({ defaultValue: { h: 100, s: 0.4, v: 0.6, a: 0.8 }, step: 10 });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    keydown(thumb, 'ArrowRight');
    await nextTick();
    expect(model.value).toMatchObject({ h: 110, s: 0.4, v: 0.6, a: 0.8 });
  });

  it('disabled: tabindex=-1 and keys do nothing', async () => {
    const { model } = mountHue({ defaultValue: { h: 100, s: 1, v: 1, a: 1 }, disabled: true });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    expect(thumb.tabIndex).toBe(-1);
    expect(thumb.getAttribute('aria-disabled')).toBe('true');
    keydown(thumb, 'ArrowRight');
    await nextTick();
    expect(model.value).toBeUndefined();
  });

  it('vertical orientation reports aria-orientation', async () => {
    mountHue({ defaultValue: { h: 100, s: 1, v: 1, a: 1 }, orientation: 'vertical' });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    expect(thumb.getAttribute('aria-orientation')).toBe('vertical');
  });
});
