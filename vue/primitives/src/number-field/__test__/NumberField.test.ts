import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import type { Component } from 'vue';
import { defineComponent, h, nextTick, ref } from 'vue';
import {
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
  NumberFieldRoot,
} from '../index';

function mountField(props: Record<string, unknown> = {}) {
  const model = ref<number | null | undefined>(undefined);
  const Harness = defineComponent({
    setup: () => () => h(NumberFieldRoot, {
      modelValue: model.value,
      'onUpdate:modelValue': (v: number | null) => { model.value = v; },
      ...props,
    }, {
      default: () => [
        h(NumberFieldInput as Component, { id: 'inp' }),
        h(NumberFieldIncrement, { id: 'inc' }, { default: () => '+' }),
        h(NumberFieldDecrement, { id: 'dec' }, { default: () => '−' }),
      ],
    }),
  });
  return { wrapper: mount(Harness, { attachTo: document.body }), model };
}

function press(el: Element, key: string): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

describe('NumberField', () => {
  it('input has role=spinbutton with ARIA attrs', () => {
    const { wrapper } = mountField({ min: 0, max: 10, defaultValue: 5 });
    const input = document.querySelector<HTMLInputElement>('#inp')!;
    expect(input.getAttribute('role')).toBe('spinbutton');
    expect(input.getAttribute('aria-valuemin')).toBe('0');
    expect(input.getAttribute('aria-valuemax')).toBe('10');
    expect(input.getAttribute('aria-valuenow')).toBe('5');
    expect(input.value).toBe('5');
    wrapper.unmount();
  });

  it('increment/decrement buttons change value', async () => {
    const { wrapper, model } = mountField({ defaultValue: 0, step: 2 });
    await nextTick();
    (document.querySelector<HTMLButtonElement>('#inc')!).click();
    await nextTick();
    expect(model.value).toBe(2);
    (document.querySelector<HTMLButtonElement>('#dec')!).click();
    await nextTick();
    expect(model.value).toBe(0);
    wrapper.unmount();
  });

  it('ArrowUp / ArrowDown step, clamped by min/max', async () => {
    const { wrapper, model } = mountField({ min: 0, max: 3, defaultValue: 2 });
    await nextTick();
    const input = document.querySelector<HTMLInputElement>('#inp')!;
    press(input, 'ArrowUp');
    await nextTick();
    expect(model.value).toBe(3);
    press(input, 'ArrowUp');
    await nextTick();
    expect(model.value).toBe(3);
    press(input, 'ArrowDown');
    press(input, 'ArrowDown');
    press(input, 'ArrowDown');
    press(input, 'ArrowDown');
    await nextTick();
    expect(model.value).toBe(0);
    wrapper.unmount();
  });

  it('PageUp/PageDown step by 10×', async () => {
    const { wrapper, model } = mountField({ defaultValue: 10, step: 1 });
    await nextTick();
    const input = document.querySelector<HTMLInputElement>('#inp')!;
    press(input, 'PageUp');
    await nextTick();
    expect(model.value).toBe(20);
    press(input, 'PageDown');
    await nextTick();
    expect(model.value).toBe(10);
    wrapper.unmount();
  });

  it('Home/End jump to min/max when defined', async () => {
    const { wrapper, model } = mountField({ min: 0, max: 100, defaultValue: 50 });
    await nextTick();
    const input = document.querySelector<HTMLInputElement>('#inp')!;
    press(input, 'End');
    await nextTick();
    expect(model.value).toBe(100);
    press(input, 'Home');
    await nextTick();
    expect(model.value).toBe(0);
    wrapper.unmount();
  });

  it('typing updates value; invalid = null', async () => {
    const { wrapper, model } = mountField({ defaultValue: 0 });
    await nextTick();
    const input = document.querySelector<HTMLInputElement>('#inp')!;
    input.value = '42';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    expect(model.value).toBe(42);
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    expect(model.value).toBeNull();
    input.value = 'abc';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    expect(model.value).toBeNull();
    wrapper.unmount();
  });

  it('disabled blocks changes', async () => {
    const { wrapper, model } = mountField({ disabled: true, defaultValue: 5 });
    await nextTick();
    (document.querySelector<HTMLButtonElement>('#inc')!).click();
    await nextTick();
    expect(model.value).toBeUndefined();
    wrapper.unmount();
  });
});
