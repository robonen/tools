import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import type { HSVA } from '../../../internal/color';
import { AlphaSliderRoot, AlphaSliderThumb } from '../index';

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

function mountAlpha(opts: Partial<{ defaultValue: HSVA; step: number; disabled: boolean }> = {}) {
  const model = ref<HSVA | undefined>(undefined);
  const Harness = defineComponent({
    setup: () => () => h(AlphaSliderRoot, {
      modelValue: model.value,
      'onUpdate:modelValue': (v: HSVA | null | undefined) => { model.value = v ?? undefined; },
      ...opts,
    }, { default: () => h(AlphaSliderThumb) }),
  });
  const w = track(mount(Harness, { attachTo: document.body }));
  return { wrapper: w, model };
}

describe('AlphaSlider', () => {
  it('thumb is role=slider with alpha aria-value*', async () => {
    mountAlpha({ defaultValue: { h: 0, s: 1, v: 1, a: 0.5 } });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    expect(thumb).toBeTruthy();
    expect(thumb.getAttribute('aria-valuemin')).toBe('0');
    expect(thumb.getAttribute('aria-valuemax')).toBe('1');
    expect(thumb.getAttribute('aria-valuenow')).toBe('0.5');
    expect(thumb.getAttribute('aria-valuetext')).toBe('50%');
    expect(thumb.getAttribute('aria-label')).toBe('Alpha');
    expect(thumb.tabIndex).toBe(0);
  });

  it('ArrowRight / ArrowLeft step the alpha', async () => {
    const { model } = mountAlpha({ defaultValue: { h: 0, s: 1, v: 1, a: 0.5 }, step: 0.1 });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    keydown(thumb, 'ArrowRight');
    await nextTick();
    expect(round(model.value!.a)).toBe(0.6);
    keydown(thumb, 'ArrowLeft');
    keydown(thumb, 'ArrowLeft');
    await nextTick();
    expect(round(model.value!.a)).toBe(0.4);
  });

  it('Home / End clamp to 0 / 1', async () => {
    const { model } = mountAlpha({ defaultValue: { h: 0, s: 1, v: 1, a: 0.5 } });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    keydown(thumb, 'Home');
    await nextTick();
    expect(model.value!.a).toBe(0);
    keydown(thumb, 'End');
    await nextTick();
    expect(model.value!.a).toBe(1);
  });

  it('clamps within [0, 1]', async () => {
    const { model } = mountAlpha({ defaultValue: { h: 0, s: 1, v: 1, a: 0.95 }, step: 0.1 });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    keydown(thumb, 'ArrowRight');
    await nextTick();
    expect(model.value!.a).toBe(1);
  });

  it('preserves hue / saturation / value while only changing alpha', async () => {
    const { model } = mountAlpha({ defaultValue: { h: 100, s: 0.4, v: 0.6, a: 0.5 }, step: 0.1 });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    keydown(thumb, 'ArrowRight');
    await nextTick();
    expect(model.value!.h).toBe(100);
    expect(model.value!.s).toBe(0.4);
    expect(model.value!.v).toBe(0.6);
    expect(round(model.value!.a)).toBe(0.6);
  });

  it('disabled: tabindex=-1 and keys do nothing', async () => {
    const { model } = mountAlpha({ defaultValue: { h: 0, s: 1, v: 1, a: 0.5 }, disabled: true });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    expect(thumb.tabIndex).toBe(-1);
    keydown(thumb, 'ArrowRight');
    await nextTick();
    expect(model.value).toBeUndefined();
  });
});
