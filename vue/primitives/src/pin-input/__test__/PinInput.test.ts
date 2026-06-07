import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import type { Component } from 'vue';
import { defineComponent, h, nextTick, ref } from 'vue';
import { PinInputInput, PinInputRoot } from '../index';

function mountPin(props: Record<string, unknown> = {}) {
  const model = ref<string[] | undefined>(undefined);
  const completed = ref<string | null>(null);
  const Harness = defineComponent({
    setup: () => () => h(PinInputRoot, {
      modelValue: model.value,
      length: 4,
      'onUpdate:modelValue': (v: string[]) => { model.value = v; },
      onComplete: (v: string) => { completed.value = v; },
      ...props,
    }, {
      default: () => [0, 1, 2, 3].map(i => h(PinInputInput as Component, { key: i, index: i })),
    }),
  });
  const wrapper = mount(Harness, { attachTo: document.body });
  return { wrapper, model, completed };
}

function inputs(): HTMLInputElement[] {
  return Array.from(document.querySelectorAll<HTMLInputElement>('input[data-index]'));
}

function type(el: HTMLInputElement, ch: string): void {
  el.value = ch;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function key(el: Element, k: string): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
}

describe('PinInput', () => {
  it('renders N inputs based on length', () => {
    const { wrapper } = mountPin();
    expect(inputs().length).toBe(4);
    wrapper.unmount();
  });

  it('typing auto-advances focus and fires complete', async () => {
    const { wrapper, model, completed } = mountPin();
    await nextTick();
    const [a, b, c, d] = inputs();
    type(a!, '1');
    await nextTick();
    expect(document.activeElement).toBe(b);
    type(b!, '2');
    type(c!, '3');
    type(d!, '4');
    await nextTick();
    expect(model.value).toEqual(['1', '2', '3', '4']);
    expect(completed.value).toBe('1234');
    wrapper.unmount();
  });

  it('Backspace on empty moves to previous and clears', async () => {
    const { wrapper, model } = mountPin();
    await nextTick();
    const [a, b] = inputs();
    type(a!, '1');
    await nextTick();
    b!.focus();
    key(b!, 'Backspace');
    await nextTick();
    expect(document.activeElement).toBe(a);
    expect(model.value![0]).toBe('');
    wrapper.unmount();
  });

  it('ArrowLeft/ArrowRight navigate', async () => {
    const { wrapper } = mountPin();
    await nextTick();
    const [a, b, c] = inputs();
    b!.focus();
    key(b!, 'ArrowLeft');
    expect(document.activeElement).toBe(a);
    key(a!, 'ArrowRight');
    expect(document.activeElement).toBe(b);
    key(b!, 'ArrowRight');
    expect(document.activeElement).toBe(c);
    wrapper.unmount();
  });

  it('type=number rejects non-digit input', async () => {
    const { wrapper, model } = mountPin({ type: 'number' });
    await nextTick();
    const [a] = inputs();
    type(a!, 'x');
    await nextTick();
    expect(model.value?.[0] ?? '').toBe('');
    type(a!, '7');
    await nextTick();
    expect(model.value![0]).toBe('7');
    wrapper.unmount();
  });

  it('paste fills across inputs', async () => {
    const { wrapper, model, completed } = mountPin();
    await nextTick();
    const [a] = inputs();
    a!.focus();
    const event = new Event('paste', { bubbles: true, cancelable: true }) as unknown as ClipboardEvent;
    Object.defineProperty(event, 'clipboardData', {
      value: { getData: (_type: string) => '9876' },
    });
    a!.dispatchEvent(event);
    await nextTick();
    expect(model.value).toEqual(['9', '8', '7', '6']);
    expect(completed.value).toBe('9876');
    wrapper.unmount();
  });

  it('mask renders password type for each input', async () => {
    const { wrapper } = mountPin({ mask: true });
    await nextTick();
    for (const el of inputs())
      expect(el.getAttribute('type')).toBe('password');
    wrapper.unmount();
  });
});
