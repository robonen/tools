import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import type { HSVA } from '../../../internal/color';
import { hsvToRgb, parseColor } from '../../../internal/color';
import { AlphaSliderRoot, AlphaSliderThumb } from '../../alpha-slider';
import { ColorAreaRoot, ColorAreaThumb } from '../../color-area';
import { HueSliderRoot, HueSliderThumb } from '../../hue-slider';
import {
  ColorFieldHiddenInput,
  ColorFieldInput,
  ColorFieldLabel,
  ColorFieldRoot,
  ColorFieldSwatch,
} from '../index';
import type { ColorFormat } from '../index';

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

function typeInput(el: HTMLInputElement, value: string): void {
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('ColorField — value & format', () => {
  it('parses a hex string default into HSVA and emits the configured format', async () => {
    const model = ref<HSVA | string | undefined>(undefined);
    const Harness = defineComponent({
      setup: () => () => h(ColorFieldRoot, {
        modelValue: model.value,
        defaultValue: '#00ff00',
        format: 'rgb',
        'onUpdate:modelValue': (v: HSVA | string | null | undefined) => { model.value = v ?? undefined; },
      }, { default: () => h(ColorFieldInput) }),
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    // #00ff00 is pure green → hsv { h: 120, s: 1, v: 1 }.
    const input = document.querySelector<HTMLInputElement>('input')!;
    expect(input.value.toLowerCase()).toBe('#00ff00');
    // First emit is the default colour serialized as rgb.
    expect(model.value).toBe('rgb(0, 255, 0)');
  });

  it('ColorFieldInput parses a typed hex into the canonical HSVA', async () => {
    const model = ref<HSVA | string | undefined>(undefined);
    const Harness = defineComponent({
      setup: () => () => h(ColorFieldRoot, {
        modelValue: model.value,
        defaultValue: '#000000',
        format: 'hex',
        'onUpdate:modelValue': (v: HSVA | string | null | undefined) => { model.value = v ?? undefined; },
      }, { default: () => h(ColorFieldInput) }),
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    const input = document.querySelector<HTMLInputElement>('input')!;
    typeInput(input, '#3366ff');
    await nextTick();
    const expected = parseColor('#3366ff')!;
    // Emitted as hex.
    expect((model.value as string).toLowerCase()).toBe('#3366ff');
    // The canonical conversion round-trips back to the same rgb.
    expect(hsvToRgb(expected)).toEqual({ r: 51, g: 102, b: 255 });
  });

  it('marks the input aria-invalid for an unparseable value and does not commit', async () => {
    const model = ref<HSVA | string | undefined>(undefined);
    const Harness = defineComponent({
      setup: () => () => h(ColorFieldRoot, {
        modelValue: model.value,
        defaultValue: '#ff0000',
        'onUpdate:modelValue': (v: HSVA | string | null | undefined) => { model.value = v ?? undefined; },
      }, { default: () => h(ColorFieldInput) }),
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    const input = document.querySelector<HTMLInputElement>('input')!;
    typeInput(input, 'not-a-color');
    await nextTick();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    // The canonical value stays the red default (#ff0000), so the emit never
    // changed to the garbage text.
    expect(model.value).toBe('#ff0000');
  });
});

describe('ColorField — cluster sync', () => {
  function mountCluster(format: ColorFormat = 'hex') {
    const model = ref<HSVA | string | undefined>(undefined);
    const Harness = defineComponent({
      setup: () => () => h(ColorFieldRoot, {
        modelValue: model.value,
        defaultValue: { h: 0, s: 1, v: 1, a: 1 },
        format,
        'onUpdate:modelValue': (v: HSVA | string | null | undefined) => { model.value = v ?? undefined; },
      }, {
        default: () => [
          h(ColorAreaRoot, null, { default: () => h(ColorAreaThumb, { id: 'area-thumb' }) }),
          h(HueSliderRoot, null, { default: () => h(HueSliderThumb, { id: 'hue-thumb' }) }),
          h(AlphaSliderRoot, null, { default: () => h(AlphaSliderThumb, { id: 'alpha-thumb' }) }),
          h(ColorFieldSwatch, { id: 'swatch' }),
        ],
      }),
    });
    const w = track(mount(Harness, { attachTo: document.body }));
    return { wrapper: w, model };
  }

  it('changing the hue slider updates the field value (cluster stays in sync)', async () => {
    const { model } = mountCluster('hsva');
    await nextTick();
    const hueThumb = document.getElementById('hue-thumb')!;
    // default hue is 0; nudge it up.
    keydown(hueThumb, 'ArrowRight');
    await nextTick();
    expect((model.value as HSVA).h).toBe(1);
    // The area thumb reads the SAME shared colour (s=1, v=1 unchanged).
    const areaThumb = document.getElementById('area-thumb')!;
    expect(areaThumb.getAttribute('aria-valuetext')).toBe('Saturation 100%, Brightness 100%');
  });

  it('all three pickers share one HSVA: area edits show on the hue/alpha thumbs', async () => {
    const { model } = mountCluster('hsva');
    await nextTick();
    const alphaThumb = document.getElementById('alpha-thumb')!;
    expect(alphaThumb.getAttribute('aria-valuenow')).toBe('1');
    keydown(alphaThumb, 'Home');
    await nextTick();
    expect((model.value as HSVA).a).toBe(0);
    // The swatch reflects the new alpha (rgba background with a=0).
    const swatch = document.getElementById('swatch')!;
    expect(swatch.style.background).toContain('rgba(255, 0, 0, 0)');
  });

  it('preserve-hue at s=0 across the cluster: hue is unchanged', async () => {
    const { model } = mountCluster('hsva');
    await nextTick();
    const hueThumb = document.getElementById('hue-thumb')!;
    // Move hue to a known non-zero value first.
    for (let i = 0; i < 5; i++) keydown(hueThumb, 'ArrowRight');
    await nextTick();
    expect((model.value as HSVA).h).toBe(5);
    const areaThumb = document.getElementById('area-thumb')!;
    // Collapse saturation to 0 then back to 1.
    keydown(areaThumb, 'Home');
    await nextTick();
    expect((model.value as HSVA).s).toBe(0);
    expect((model.value as HSVA).h).toBe(5);
    keydown(areaThumb, 'End');
    await nextTick();
    expect((model.value as HSVA).s).toBe(1);
    expect((model.value as HSVA).h).toBe(5);
  });
});

describe('ColorField — accessibility & form', () => {
  it('ColorFieldLabel provides an id the sub-pickers reference via aria-labelledby', async () => {
    const Harness = defineComponent({
      setup: () => () => h(ColorFieldRoot, { defaultValue: '#ff0000' }, {
        default: () => [
          h(ColorFieldLabel, { id: 'cf-label' }, { default: () => 'Brand colour' }),
          h(HueSliderRoot, null, { default: () => h(HueSliderThumb, { id: 'hue-thumb' }) }),
        ],
      }),
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    const hueThumb = document.getElementById('hue-thumb')!;
    expect(hueThumb.getAttribute('aria-labelledby')).toBe('cf-label');
    // The default 'Hue' label is suppressed in favour of the shared name.
    expect(hueThumb.getAttribute('aria-label')).toBeNull();
  });

  it('ColorFieldHiddenInput carries the value when name is set', async () => {
    const Harness = defineComponent({
      setup: () => () => h(ColorFieldRoot, { defaultValue: '#ff0000' }, {
        default: () => h(ColorFieldHiddenInput, { name: 'brand' }),
      }),
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    const input = document.querySelector<HTMLInputElement>('input[name="brand"]')!;
    expect(input).toBeTruthy();
    // Serialized as #rrggbbaa so alpha survives.
    expect(input.value.toLowerCase()).toBe('#ff0000ff');
  });

  it('ColorFieldRoot name renders a hidden form input directly', async () => {
    const Harness = defineComponent({
      setup: () => () => h(ColorFieldRoot, { defaultValue: '#00ff00', name: 'fav' }, {
        default: () => h(ColorFieldSwatch),
      }),
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    const input = document.querySelector<HTMLInputElement>('input[name="fav"]')!;
    expect(input).toBeTruthy();
    expect(input.value.toLowerCase()).toBe('#00ff00ff');
  });

  it('the swatch exposes role=img with a formatted aria-label', async () => {
    const Harness = defineComponent({
      setup: () => () => h(ColorFieldRoot, { defaultValue: '#ff0000' }, {
        default: () => h(ColorFieldSwatch, { id: 'swatch' }),
      }),
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    const swatch = document.getElementById('swatch')!;
    expect(swatch.getAttribute('role')).toBe('img');
    expect(swatch.getAttribute('aria-label')!.toLowerCase()).toBe('#ff0000ff');
  });
});
