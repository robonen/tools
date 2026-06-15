import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { provideConfig } from '../../../utilities/config-provider';
import {
  CompareSliderAfter,
  CompareSliderBefore,
  CompareSliderDivider,
  CompareSliderHandle,
  CompareSliderRoot,
} from '../index';

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

type RootOpts = Partial<{
  defaultPosition: number;
  disabled: boolean;
  inverted: boolean;
  orientation: 'horizontal' | 'vertical';
  dir: 'ltr' | 'rtl';
  keyboardStep: number;
  keyboardLargeStep: number;
}>;

function mountSlider(opts: RootOpts = {}, wrapInConfig?: { dir?: 'ltr' | 'rtl' }) {
  const model = ref<number | undefined>(undefined);
  const Harness = defineComponent({
    setup() {
      const tree = () => h(CompareSliderRoot, {
        position: model.value,
        'onUpdate:position': (v: number | undefined) => { model.value = v; },
        ...opts,
      }, {
        default: () => [
          h(CompareSliderBefore),
          h(CompareSliderAfter, { id: 'after' }),
          h(CompareSliderDivider),
          h(CompareSliderHandle, { id: 'handle' }),
        ],
      });
      return () => wrapInConfig
        ? h(ConfigProvider, { dir: wrapInConfig.dir }, { default: tree })
        : tree();
    },
  });
  const w = track(mount(Harness, { attachTo: document.body }));
  return { wrapper: w, model };
}

function keydown(el: Element, key: string, opts: { shiftKey?: boolean } = {}): void {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, shiftKey: opts.shiftKey ?? false });
  el.dispatchEvent(event);
}

describe('CompareSlider — rendering & ARIA', () => {
  it('renders the handle as role="slider" with correct aria-value*', async () => {
    mountSlider({ defaultPosition: 40 });
    await nextTick();
    const handle = document.querySelector<HTMLElement>('[role="slider"]')!;
    expect(handle).toBeTruthy();
    expect(handle.getAttribute('aria-valuemin')).toBe('0');
    expect(handle.getAttribute('aria-valuemax')).toBe('100');
    expect(handle.getAttribute('aria-valuenow')).toBe('40');
    expect(handle.getAttribute('aria-orientation')).toBe('horizontal');
    expect(handle.tabIndex).toBe(0);
  });

  it('applies the default aria-label "Comparison position"', async () => {
    mountSlider({ defaultPosition: 50 });
    await nextTick();
    const handle = document.querySelector<HTMLElement>('[role="slider"]')!;
    expect(handle.getAttribute('aria-label')).toBe('Comparison position');
  });

  it('an explicit aria-label wins over the default', async () => {
    const Harness = defineComponent({
      setup: () => () => h(CompareSliderRoot, { defaultPosition: 50 }, {
        default: () => [
          h(CompareSliderBefore),
          h(CompareSliderAfter),
          h(CompareSliderHandle, { 'aria-label': 'Reveal' }),
        ],
      }),
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    const handle = document.querySelector<HTMLElement>('[role="slider"]')!;
    expect(handle.getAttribute('aria-label')).toBe('Reveal');
  });

  it('sets data-orientation as a literal on the root and handle', async () => {
    mountSlider({ defaultPosition: 50, orientation: 'vertical' });
    await nextTick();
    const handle = document.getElementById('handle')!;
    expect(handle.getAttribute('data-orientation')).toBe('vertical');
    expect(handle.getAttribute('aria-orientation')).toBe('vertical');
  });
});

describe('CompareSlider — keyboard', () => {
  it('ArrowRight increments and ArrowLeft decrements the position', async () => {
    const { model } = mountSlider({ defaultPosition: 50, keyboardStep: 5 });
    await nextTick();
    const handle = document.querySelector<HTMLElement>('[role="slider"]')!;
    keydown(handle, 'ArrowRight');
    await nextTick();
    expect(model.value).toBe(55);
    keydown(handle, 'ArrowLeft');
    keydown(handle, 'ArrowLeft');
    await nextTick();
    expect(model.value).toBe(45);
  });

  it('ArrowRight is reversed under dir="rtl"', async () => {
    const { model } = mountSlider({ defaultPosition: 50, keyboardStep: 5, dir: 'rtl' });
    await nextTick();
    const handle = document.querySelector<HTMLElement>('[role="slider"]')!;
    keydown(handle, 'ArrowRight');
    await nextTick();
    expect(model.value).toBe(45);
    keydown(handle, 'ArrowLeft');
    await nextTick();
    expect(model.value).toBe(50);
  });

  it('Shift+Arrow and Page keys use the large step', async () => {
    const { model } = mountSlider({ defaultPosition: 50, keyboardStep: 1, keyboardLargeStep: 10 });
    await nextTick();
    const handle = document.querySelector<HTMLElement>('[role="slider"]')!;
    keydown(handle, 'ArrowRight', { shiftKey: true });
    await nextTick();
    expect(model.value).toBe(60);
    keydown(handle, 'PageDown');
    keydown(handle, 'PageDown');
    await nextTick();
    expect(model.value).toBe(40);
  });

  it('Home/End jump to 0/100', async () => {
    const { model } = mountSlider({ defaultPosition: 50 });
    await nextTick();
    const handle = document.querySelector<HTMLElement>('[role="slider"]')!;
    keydown(handle, 'Home');
    await nextTick();
    expect(model.value).toBe(0);
    keydown(handle, 'End');
    await nextTick();
    expect(model.value).toBe(100);
  });

  it('clamps at 0 and 100', async () => {
    const { model } = mountSlider({ defaultPosition: 95, keyboardStep: 10 });
    await nextTick();
    const handle = document.querySelector<HTMLElement>('[role="slider"]')!;
    keydown(handle, 'ArrowRight');
    await nextTick();
    expect(model.value).toBe(100);
    keydown(handle, 'Home');
    keydown(handle, 'ArrowLeft');
    await nextTick();
    expect(model.value).toBe(0);
  });

  it('vertical: ArrowDown increases, ArrowUp decreases (no-flip reveals the top)', async () => {
    const { model } = mountSlider({ defaultPosition: 50, orientation: 'vertical', keyboardStep: 5 });
    await nextTick();
    const handle = document.querySelector<HTMLElement>('[role="slider"]')!;
    keydown(handle, 'ArrowDown');
    await nextTick();
    expect(model.value).toBe(55);
    keydown(handle, 'ArrowUp');
    keydown(handle, 'ArrowUp');
    await nextTick();
    expect(model.value).toBe(45);
  });

  it('disabled: tabindex=-1, aria-disabled, and keys do nothing', async () => {
    const { model } = mountSlider({ defaultPosition: 50, disabled: true });
    await nextTick();
    const handle = document.querySelector<HTMLElement>('[role="slider"]')!;
    expect(handle.tabIndex).toBe(-1);
    expect(handle.getAttribute('aria-disabled')).toBe('true');
    keydown(handle, 'ArrowRight');
    keydown(handle, 'Home');
    await nextTick();
    expect(model.value).toBeUndefined();
    expect(handle.getAttribute('aria-valuenow')).toBe('50');
  });
});

describe('CompareSlider — after-layer clip-path', () => {
  it('clip-path inset reflects position (horizontal, no flip → clips the right)', async () => {
    mountSlider({ defaultPosition: 30 });
    await nextTick();
    const after = document.getElementById('after')!;
    // 30% revealed from the left → right edge clipped by 70%.
    expect(after.style.clipPath).toBe('inset(0% 70% 0% 0%)');
  });

  it('updates the clip-path when the position changes', async () => {
    const { model } = mountSlider({ defaultPosition: 50, keyboardStep: 10 });
    await nextTick();
    const handle = document.querySelector<HTMLElement>('[role="slider"]')!;
    const after = document.getElementById('after')!;
    keydown(handle, 'ArrowRight');
    await nextTick();
    expect(model.value).toBe(60);
    expect(after.style.clipPath).toBe('inset(0% 40% 0% 0%)');
  });

  it('inverted flips the clipped side (horizontal → clips the left)', async () => {
    mountSlider({ defaultPosition: 30, inverted: true });
    await nextTick();
    const after = document.getElementById('after')!;
    expect(after.style.clipPath).toBe('inset(0% 0% 0% 70%)');
  });

  it('vertical (no flip) clips the bottom edge', async () => {
    mountSlider({ defaultPosition: 30, orientation: 'vertical' });
    await nextTick();
    const after = document.getElementById('after')!;
    // The browser collapses the trailing `0%` (CSSOM `inset()` serialization,
    // like `margin`): `inset(0% 0% 70% 0%)` → `inset(0% 0% 70%)`.
    expect(after.style.clipPath).toBe('inset(0% 0% 70%)');
  });

  it('0 and 100 produce no sliver (full hide / full show)', async () => {
    const { model } = mountSlider({ defaultPosition: 50 });
    await nextTick();
    const handle = document.querySelector<HTMLElement>('[role="slider"]')!;
    const after = document.getElementById('after')!;
    keydown(handle, 'Home');
    await nextTick();
    expect(model.value).toBe(0);
    // 0% revealed → right edge clipped by the full 100% (nothing shown).
    expect(after.style.clipPath).toBe('inset(0% 100% 0% 0%)');
    keydown(handle, 'End');
    await nextTick();
    // 100% revealed → no clipping; the browser collapses `inset(0% 0% 0% 0%)`
    // to the single-value shorthand `inset(0%)`.
    expect(after.style.clipPath).toBe('inset(0%)');
  });
});

describe('CompareSlider — pointer drag', () => {
  it('maps a pointerdown on the root onto the reveal position', async () => {
    const { model } = mountSlider({ defaultPosition: 50 });
    await nextTick();
    const root = document.querySelector<HTMLElement>('[data-orientation]')!;
    // Give the root a deterministic box.
    root.style.width = '200px';
    root.style.height = '100px';
    await nextTick();
    const rect = root.getBoundingClientRect();
    const down = new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      button: 0,
      pointerId: 1,
      clientX: rect.left + rect.width * 0.25,
      clientY: rect.top + rect.height / 2,
    });
    root.dispatchEvent(down);
    await nextTick();
    expect(model.value).toBeCloseTo(25, 0);
  });

  it('disabled blocks pointer drag', async () => {
    const { model } = mountSlider({ defaultPosition: 50, disabled: true });
    await nextTick();
    const root = document.querySelector<HTMLElement>('[data-orientation]')!;
    root.style.width = '200px';
    const rect = root.getBoundingClientRect();
    const down = new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      button: 0,
      pointerId: 1,
      clientX: rect.left + rect.width * 0.75,
      clientY: rect.top + 10,
    });
    root.dispatchEvent(down);
    await nextTick();
    expect(model.value).toBeUndefined();
  });
});

describe('CompareSlider — controlled position model', () => {
  it('reflects an external position update onto aria-valuenow and clip-path', async () => {
    const model = ref<number | undefined>(20);
    const Harness = defineComponent({
      setup: () => () => h(CompareSliderRoot, {
        position: model.value,
        'onUpdate:position': (v: number | undefined) => { model.value = v; },
      }, {
        default: () => [
          h(CompareSliderBefore),
          h(CompareSliderAfter, { id: 'after2' }),
          h(CompareSliderHandle, { id: 'handle2' }),
        ],
      }),
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    const handle = document.getElementById('handle2')!;
    expect(handle.getAttribute('aria-valuenow')).toBe('20');
    model.value = 75;
    await nextTick();
    expect(handle.getAttribute('aria-valuenow')).toBe('75');
    expect(document.getElementById('after2')!.style.clipPath).toBe('inset(0% 25% 0% 0%)');
  });
});
