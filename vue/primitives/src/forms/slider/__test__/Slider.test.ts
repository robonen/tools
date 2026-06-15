import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { provideConfig } from '../../../utilities/config-provider';
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from '../index';

// Minimal declarative config wrapper (the package ships no ConfigProvider
// component; config is provided via `provideConfig` inside a setup).
const ConfigProvider = defineComponent({
  props: { dir: { type: String, default: undefined } },
  setup(props, { slots }) {
    provideConfig({ dir: () => props.dir as 'ltr' | 'rtl' | undefined });
    return () => slots.default?.();
  },
});

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

function keydown(el: Element, key: string, opts: { shiftKey?: boolean } = {}): void {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, shiftKey: opts.shiftKey ?? false });
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

describe('Slider — Shift+Arrow large step', () => {
  it('Shift+ArrowRight/Left jumps by step × largeStep multiplier (default 10×)', async () => {
    const { model } = mountSingle({ defaultValue: 50, step: 1 });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    keydown(thumb, 'ArrowRight', { shiftKey: true });
    await nextTick();
    expect(model.value).toEqual([60]);
    keydown(thumb, 'ArrowLeft', { shiftKey: true });
    keydown(thumb, 'ArrowLeft', { shiftKey: true });
    await nextTick();
    expect(model.value).toEqual([40]);
  });

  it('Shift+ArrowUp/Down jumps by large step in vertical orientation', async () => {
    const { model } = mountSingle({ defaultValue: 50, step: 1, orientation: 'vertical' });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    keydown(thumb, 'ArrowUp', { shiftKey: true });
    await nextTick();
    expect(model.value).toEqual([60]);
  });

  it('honours a custom largeStep prop for both Page and Shift+Arrow', async () => {
    const Harness = defineComponent({
      setup() {
        const model = ref<number[]>([50]);
        return () => h(SliderRoot, {
          modelValue: model.value,
          step: 1,
          largeStep: 25,
          'onUpdate:modelValue': (v: number[]) => { model.value = v; },
        }, {
          default: () => [
            h(SliderTrack, null, { default: () => h(SliderRange) }),
            h(SliderThumb, { 'aria-label': 'V' }),
          ],
        });
      },
    });
    const w = track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    keydown(thumb, 'PageUp');
    await nextTick();
    expect(thumb.getAttribute('aria-valuenow')).toBe('75');
    keydown(thumb, 'ArrowLeft', { shiftKey: true });
    await nextTick();
    expect(thumb.getAttribute('aria-valuenow')).toBe('50');
    w.unmount();
  });

  it('Shift has no effect on Home/End (still clamps to bounds)', async () => {
    const { model } = mountSingle({ defaultValue: 50, min: 0, max: 100 });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    keydown(thumb, 'Home', { shiftKey: true });
    await nextTick();
    expect(model.value).toEqual([0]);
  });
});

describe('Slider — default accessible thumb labels', () => {
  it('single thumb has no auto label (value is self-describing)', async () => {
    const Harness = defineComponent({
      setup: () => () => h(SliderRoot, { defaultValue: 40 }, {
        default: () => [
          h(SliderTrack, null, { default: () => h(SliderRange) }),
          h(SliderThumb),
        ],
      }),
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    expect(thumb.getAttribute('aria-label')).toBeNull();
  });

  it('two thumbs default to Minimum / Maximum', async () => {
    const Harness = defineComponent({
      setup: () => () => h(SliderRoot, { defaultValue: [20, 80] }, {
        default: () => [
          h(SliderTrack, null, { default: () => h(SliderRange) }),
          h(SliderThumb),
          h(SliderThumb),
        ],
      }),
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    const thumbs = document.querySelectorAll<HTMLElement>('[role="slider"]');
    expect(thumbs[0]!.getAttribute('aria-label')).toBe('Minimum');
    expect(thumbs[1]!.getAttribute('aria-label')).toBe('Maximum');
  });

  it('three or more thumbs default to "Value N of M"', async () => {
    const Harness = defineComponent({
      setup: () => () => h(SliderRoot, { defaultValue: [10, 50, 90] }, {
        default: () => [
          h(SliderTrack, null, { default: () => h(SliderRange) }),
          h(SliderThumb),
          h(SliderThumb),
          h(SliderThumb),
        ],
      }),
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    const thumbs = document.querySelectorAll<HTMLElement>('[role="slider"]');
    expect(thumbs[0]!.getAttribute('aria-label')).toBe('Value 1 of 3');
    expect(thumbs[1]!.getAttribute('aria-label')).toBe('Value 2 of 3');
    expect(thumbs[2]!.getAttribute('aria-label')).toBe('Value 3 of 3');
  });

  it('an explicit aria-label wins over the default', async () => {
    const Harness = defineComponent({
      setup: () => () => h(SliderRoot, { defaultValue: [20, 80] }, {
        default: () => [
          h(SliderTrack, null, { default: () => h(SliderRange) }),
          h(SliderThumb, { 'aria-label': 'Lower bound' }),
          h(SliderThumb),
        ],
      }),
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    const thumbs = document.querySelectorAll<HTMLElement>('[role="slider"]');
    expect(thumbs[0]!.getAttribute('aria-label')).toBe('Lower bound');
    expect(thumbs[1]!.getAttribute('aria-label')).toBe('Maximum');
  });

  it('aria-labelledby suppresses the default label', async () => {
    const Harness = defineComponent({
      setup: () => () => h(SliderRoot, { defaultValue: [20, 80] }, {
        default: () => [
          h(SliderTrack, null, { default: () => h(SliderRange) }),
          h(SliderThumb, { 'aria-labelledby': 'lbl-0' }),
          h(SliderThumb),
        ],
      }),
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    const thumbs = document.querySelectorAll<HTMLElement>('[role="slider"]');
    expect(thumbs[0]!.getAttribute('aria-label')).toBeNull();
    expect(thumbs[0]!.getAttribute('aria-labelledby')).toBe('lbl-0');
  });
});

describe('Slider — aria-valuetext formatter', () => {
  it('applies the valueText formatter to each thumb', async () => {
    const Harness = defineComponent({
      setup: () => () => h(SliderRoot, {
        defaultValue: [20, 80],
        valueText: (v: number) => `${v}%`,
      }, {
        default: () => [
          h(SliderTrack, null, { default: () => h(SliderRange) }),
          h(SliderThumb),
          h(SliderThumb),
        ],
      }),
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    const thumbs = document.querySelectorAll<HTMLElement>('[role="slider"]');
    expect(thumbs[0]!.getAttribute('aria-valuetext')).toBe('20%');
    expect(thumbs[1]!.getAttribute('aria-valuetext')).toBe('80%');
  });

  it('passes the thumb index to the formatter', async () => {
    const Harness = defineComponent({
      setup: () => () => h(SliderRoot, {
        defaultValue: [20, 80],
        valueText: (v: number, i: number) => `idx${i}:${v}`,
      }, {
        default: () => [
          h(SliderTrack, null, { default: () => h(SliderRange) }),
          h(SliderThumb),
          h(SliderThumb),
        ],
      }),
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    const thumbs = document.querySelectorAll<HTMLElement>('[role="slider"]');
    expect(thumbs[0]!.getAttribute('aria-valuetext')).toBe('idx0:20');
    expect(thumbs[1]!.getAttribute('aria-valuetext')).toBe('idx1:80');
  });

  it('no aria-valuetext when no formatter is provided', async () => {
    mountSingle({ defaultValue: 40 });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    expect(thumb.getAttribute('aria-valuetext')).toBeNull();
  });

  it('an explicit aria-valuetext attr wins over the formatter', async () => {
    const Harness = defineComponent({
      setup: () => () => h(SliderRoot, {
        defaultValue: [50],
        valueText: (v: number) => `${v}%`,
      }, {
        default: () => [
          h(SliderTrack, null, { default: () => h(SliderRange) }),
          h(SliderThumb, { 'aria-valuetext': 'fifty' }),
        ],
      }),
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    expect(thumb.getAttribute('aria-valuetext')).toBe('fifty');
  });
});

describe('Slider — global direction inheritance', () => {
  it('inherits dir="rtl" from a ConfigProvider when no dir prop is set', async () => {
    const Harness = defineComponent({
      setup() {
        const model = ref<number[]>([50]);
        return () => h(ConfigProvider, { dir: 'rtl' }, {
          default: () => h(SliderRoot, {
            modelValue: model.value,
            step: 5,
            'onUpdate:modelValue': (v: number[]) => { model.value = v; },
          }, {
            default: () => [
              h(SliderTrack, null, { default: () => h(SliderRange) }),
              h(SliderThumb, { 'aria-label': 'V', id: 't' }),
            ],
          }),
        });
      },
    });
    const w = track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    const thumb = document.getElementById('t')!;
    // In RTL, ArrowLeft increases the value (reversed) — proving the inherited dir reached the thumb.
    keydown(thumb, 'ArrowLeft');
    await nextTick();
    expect(thumb.getAttribute('aria-valuenow')).toBe('55');
    w.unmount();
  });

  it('an explicit dir prop overrides the ConfigProvider dir', async () => {
    const Harness = defineComponent({
      setup() {
        const model = ref<number[]>([50]);
        return () => h(ConfigProvider, { dir: 'rtl' }, {
          default: () => h(SliderRoot, {
            modelValue: model.value,
            step: 5,
            dir: 'ltr',
            'onUpdate:modelValue': (v: number[]) => { model.value = v; },
          }, {
            default: () => [
              h(SliderTrack, null, { default: () => h(SliderRange) }),
              h(SliderThumb, { 'aria-label': 'V', id: 't2' }),
            ],
          }),
        });
      },
    });
    const w = track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    const thumb = document.getElementById('t2')!;
    // Explicit ltr: ArrowLeft decreases.
    keydown(thumb, 'ArrowLeft');
    await nextTick();
    expect(thumb.getAttribute('aria-valuenow')).toBe('45');
    w.unmount();
  });
});

describe('Slider — null modelValue tolerance', () => {
  it('seeds from defaultValue when modelValue is null', async () => {
    const Harness = defineComponent({
      setup() {
        const model = ref<number[] | null>(null);
        return () => h(SliderRoot, {
          modelValue: model.value,
          defaultValue: 30,
          'onUpdate:modelValue': (v: number[]) => { model.value = v; },
        }, {
          default: () => [
            h(SliderTrack, null, { default: () => h(SliderRange) }),
            h(SliderThumb, { 'aria-label': 'V' }),
          ],
        });
      },
    });
    const w = track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    expect(thumb.getAttribute('aria-valuenow')).toBe('30');
    w.unmount();
  });
});

describe('Slider — thumbAlignment', () => {
  it('overflow (default) positions thumbs purely by percentage', async () => {
    mountSingle({ defaultValue: 50, min: 0, max: 100 });
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    // 50% with no in-bounds offset.
    expect(thumb.style.left).toBe('50%');
  });

  it('contain produces a calc() with an in-bounds offset', async () => {
    const Harness = defineComponent({
      setup: () => () => h(SliderRoot, {
        defaultValue: 0,
        min: 0,
        max: 100,
        thumbAlignment: 'contain',
      }, {
        default: () => [
          h(SliderTrack, null, { default: () => h(SliderRange) }),
          h(SliderThumb, { 'aria-label': 'V' }),
        ],
      }),
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    const thumb = document.querySelector<HTMLElement>('[role="slider"]')!;
    // jsdom reports element size as 0, so the offset collapses to 0px and the
    // contain path still yields a percentage (no crash, monomorphic shape).
    expect(thumb.style.left).toBe('0%');
    expect(thumb.getAttribute('data-orientation')).toBe('horizontal');
  });
});
