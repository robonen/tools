import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from '../index';

const wrappers: Array<VueWrapper<any>> = [];

afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
});

function track<T extends VueWrapper<any>>(w: T): T {
  wrappers.push(w);
  return w;
}

function mountSingle(opts: Partial<{ min: number; max: number; step: number; defaultValue: number; disabled: boolean; orientation: 'horizontal' | 'vertical'; dir: 'ltr' | 'rtl' }> = {}) {
  const model = ref<number[] | undefined>(undefined);
  const Harness = defineComponent({
    setup() {
      return () => h(SliderRoot, {
        modelValue: model.value,
        'onUpdate:modelValue': (v: number[]) => { model.value = v; },
        ...opts,
      }, {
        default: () => [
          h(SliderTrack, null, { default: () => h(SliderRange) }),
          h(SliderThumb, { 'aria-label': 'Volume' }),
        ],
      });
    },
  });
  const w = track(mount(Harness, { attachTo: document.body }));
  return { wrapper: w, model };
}

function mountRange(opts: Partial<{ min: number; max: number; step: number; defaultValue: number[]; minStepsBetweenThumbs: number }> = {}) {
  const model = ref<number[] | undefined>(undefined);
  const Harness = defineComponent({
    setup() {
      return () => h(SliderRoot, {
        modelValue: model.value,
        'onUpdate:modelValue': (v: number[]) => { model.value = v; },
        ...opts,
      }, {
        default: () => [
          h(SliderTrack, null, { default: () => h(SliderRange) }),
          h(SliderThumb, { id: 'thumb-0' }),
          h(SliderThumb, { id: 'thumb-1' }),
        ],
      });
    },
  });
  const w = track(mount(Harness, { attachTo: document.body }));
  return { wrapper: w, model };
}

function keydown(el: Element, key: string): void {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  el.dispatchEvent(event);
}

describe('Slider — single thumb', () => {
  it('renders with role="slider" and ARIA attrs', async () => {
    mountSingle({ defaultValue: 40, min: 0, max: 100 });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    expect(thumb).toBeTruthy();
    expect(thumb.getAttribute('aria-valuemin')).toBe('0');
    expect(thumb.getAttribute('aria-valuemax')).toBe('100');
    expect(thumb.getAttribute('aria-valuenow')).toBe('40');
    expect(thumb.getAttribute('aria-orientation')).toBe('horizontal');
    expect(thumb.tabIndex).toBe(0);
  });

  it('ArrowRight/ArrowLeft adjust by step', async () => {
    const { model } = mountSingle({ defaultValue: 50, step: 5 });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    keydown(thumb, 'ArrowRight');
    await nextTick();
    expect(model.value).toEqual([55]);
    keydown(thumb, 'ArrowLeft');
    keydown(thumb, 'ArrowLeft');
    await nextTick();
    expect(model.value).toEqual([45]);
  });

  it('ArrowLeft is reversed in RTL', async () => {
    const { model } = mountSingle({ defaultValue: 50, step: 5, dir: 'rtl' });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    keydown(thumb, 'ArrowLeft');
    await nextTick();
    expect(model.value).toEqual([55]);
  });

  it('Home/End clamp to min/max', async () => {
    const { model } = mountSingle({ defaultValue: 50, min: 0, max: 100 });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    keydown(thumb, 'Home');
    await nextTick();
    expect(model.value).toEqual([0]);
    keydown(thumb, 'End');
    await nextTick();
    expect(model.value).toEqual([100]);
  });

  it('PageUp / PageDown step by 10×', async () => {
    const { model } = mountSingle({ defaultValue: 50, step: 1 });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    keydown(thumb, 'PageUp');
    await nextTick();
    expect(model.value).toEqual([60]);
    keydown(thumb, 'PageDown');
    keydown(thumb, 'PageDown');
    await nextTick();
    expect(model.value).toEqual([40]);
  });

  it('clamps at min / max', async () => {
    const { model } = mountSingle({ defaultValue: 95, min: 0, max: 100, step: 10 });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    keydown(thumb, 'ArrowRight');
    await nextTick();
    expect(model.value).toEqual([100]);
    keydown(thumb, 'End');
    await nextTick();
    expect(model.value).toEqual([100]);
    keydown(thumb, 'Home');
    await nextTick();
    expect(model.value).toEqual([0]);
    keydown(thumb, 'ArrowLeft');
    await nextTick();
    expect(model.value).toEqual([0]);
  });

  it('disabled: tabindex=-1 and keys do nothing', async () => {
    const { model } = mountSingle({ defaultValue: 50, disabled: true });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    expect(thumb.tabIndex).toBe(-1);
    expect(thumb.getAttribute('aria-disabled')).toBe('true');
    keydown(thumb, 'ArrowRight');
    await nextTick();
    expect(model.value).toBeUndefined();
  });

  it('vertical orientation reports aria-orientation', async () => {
    mountSingle({ defaultValue: 50, orientation: 'vertical' });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    expect(thumb.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('writes hidden input when name is set', async () => {
    const Harness = defineComponent({
      setup: () => () => h(SliderRoot, { defaultValue: 30, name: 'volume' }, {
        default: () => [
          h(SliderTrack, null, { default: () => h(SliderRange) }),
          h(SliderThumb),
        ],
      }),
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    const input = document.querySelector<HTMLInputElement>('input[type="hidden"][name="volume"]')!;
    expect(input).toBeTruthy();
    expect(input.value).toBe('30');
  });
});

describe('Slider — range (two thumbs)', () => {
  it('renders two thumbs with independent aria-valuenow', async () => {
    mountRange({ defaultValue: [20, 80] });
    await nextTick();
    const thumbs = document.querySelectorAll<HTMLElement>('[role="slider"]');
    expect(thumbs).toHaveLength(2);
    expect(thumbs[0]!.getAttribute('aria-valuenow')).toBe('20');
    expect(thumbs[1]!.getAttribute('aria-valuenow')).toBe('80');
  });

  it('preserves order by clamping against neighbour', async () => {
    const { model } = mountRange({ defaultValue: [40, 50], step: 1 });
    await nextTick();
    const thumbs = document.querySelectorAll<HTMLElement>('[role="slider"]');
    // Push first thumb right past second
    for (let i = 0; i < 20; i++) keydown(thumbs[0]!, 'ArrowRight');
    await nextTick();
    expect(model.value![0]).toBeLessThanOrEqual(model.value![1]!);
    expect(model.value![0]).toBe(50);
  });

  it('respects minStepsBetweenThumbs', async () => {
    const { model } = mountRange({ defaultValue: [30, 50], step: 1, minStepsBetweenThumbs: 10 });
    await nextTick();
    const thumbs = document.querySelectorAll<HTMLElement>('[role="slider"]');
    // Try to move first thumb up; should stop 10 below second.
    for (let i = 0; i < 30; i++) keydown(thumbs[0]!, 'ArrowRight');
    await nextTick();
    expect(model.value![0]).toBe(40);
    expect(model.value![1]).toBe(50);
  });

  it('writes hidden inputs with [] suffix for range', async () => {
    const Harness = defineComponent({
      setup: () => () => h(SliderRoot, { defaultValue: [10, 90], name: 'range' }, {
        default: () => [
          h(SliderTrack, null, { default: () => h(SliderRange) }),
          h(SliderThumb),
          h(SliderThumb),
        ],
      }),
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    const inputs = document.querySelectorAll<HTMLInputElement>('input[type="hidden"][name="range[]"]');
    expect(inputs).toHaveLength(2);
    expect(inputs[0]!.value).toBe('10');
    expect(inputs[1]!.value).toBe('90');
  });
});
