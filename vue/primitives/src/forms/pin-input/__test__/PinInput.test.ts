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

  it('sets per-input aria-label and group role', async () => {
    const { wrapper } = mountPin();
    await nextTick();
    const group = document.querySelector('[role="group"]');
    expect(group).toBeTruthy();
    const all = inputs();
    expect(all[0]!.getAttribute('aria-label')).toBe('pin input 1 of 4');
    expect(all[3]!.getAttribute('aria-label')).toBe('pin input 4 of 4');
    wrapper.unmount();
  });

  it('exposes data-complete on root and inputs once filled', async () => {
    const { wrapper } = mountPin();
    await nextTick();
    const group = document.querySelector('[role="group"]')!;
    expect(group.hasAttribute('data-complete')).toBe(false);
    const [a, b, c, d] = inputs();
    type(a!, '1');
    type(b!, '2');
    type(c!, '3');
    type(d!, '4');
    await nextTick();
    expect(group.hasAttribute('data-complete')).toBe(true);
    expect(inputs()[0]!.hasAttribute('data-complete')).toBe(true);
    wrapper.unmount();
  });

  it('sets numeric hardening attributes when type=number', async () => {
    const { wrapper } = mountPin({ type: 'number' });
    await nextTick();
    const a = inputs()[0]!;
    expect(a.getAttribute('inputmode')).toBe('numeric');
    expect(a.getAttribute('pattern')).toBe('[0-9]*');
    expect(a.getAttribute('autocapitalize')).toBe('none');
    wrapper.unmount();
  });

  it('renders a hidden form input when name is provided', async () => {
    const { wrapper } = mountPin({ name: 'otp', required: true, id: 'otp-field' });
    await nextTick();
    const hidden = document.querySelector<HTMLInputElement>('input[name="otp"]');
    expect(hidden).toBeTruthy();
    expect(hidden!.required).toBe(true);
    const [a, b] = inputs();
    type(a!, '1');
    type(b!, '2');
    await nextTick();
    expect(hidden!.value).toBe('12');
    wrapper.unmount();
  });

  it('does not render a hidden form input without name', async () => {
    const { wrapper } = mountPin();
    await nextTick();
    expect(document.querySelector('input[name]')).toBeNull();
    wrapper.unmount();
  });

  it('hidden input focus forwards to the first cell', async () => {
    const { wrapper } = mountPin({ name: 'otp' });
    await nextTick();
    const hidden = document.querySelector<HTMLInputElement>('input[name="otp"]')!;
    hidden.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    await nextTick();
    expect(document.activeElement).toBe(inputs()[0]);
    wrapper.unmount();
  });

  it('RTL flips arrow-key navigation', async () => {
    const { wrapper } = mountPin({ dir: 'rtl' });
    await nextTick();
    const [a, b, c] = inputs();
    b!.focus();
    key(b!, 'ArrowRight');
    expect(document.activeElement).toBe(a);
    key(a!, 'ArrowLeft');
    expect(document.activeElement).toBe(b);
    key(b!, 'ArrowLeft');
    expect(document.activeElement).toBe(c);
    wrapper.unmount();
  });

  it('Home/End jump to edges', async () => {
    const { wrapper } = mountPin();
    await nextTick();
    const all = inputs();
    all[1]!.focus();
    key(all[1]!, 'End');
    expect(document.activeElement).toBe(all[3]);
    key(all[3]!, 'Home');
    expect(document.activeElement).toBe(all[0]);
    wrapper.unmount();
  });

  it('per-input disabled blocks navigation onto the cell and skips it', async () => {
    const model = ref<string[] | undefined>(undefined);
    const Harness = defineComponent({
      setup: () => () => h(PinInputRoot, {
        modelValue: model.value,
        length: 3,
        'onUpdate:modelValue': (v: string[]) => { model.value = v; },
      }, {
        default: () => [
          h(PinInputInput as Component, { key: 0, index: 0 }),
          h(PinInputInput as Component, { key: 1, index: 1, disabled: true }),
          h(PinInputInput as Component, { key: 2, index: 2 }),
        ],
      }),
    });
    const wrapper = mount(Harness, { attachTo: document.body });
    await nextTick();
    const all = inputs();
    expect(all[1]!.disabled).toBe(true);
    expect(all[1]!.hasAttribute('data-disabled')).toBe(true);
    all[0]!.focus();
    key(all[0]!, 'ArrowRight');
    // skips the disabled middle cell, lands on index 2
    expect(document.activeElement).toBe(all[2]);
    wrapper.unmount();
  });

  it('OTP mode redirects focus to the first empty cell', async () => {
    const { wrapper, model } = mountPin({ otp: true });
    await nextTick();
    const all = inputs();
    type(all[0]!, '1');
    await nextTick();
    expect(model.value?.[0]).toBe('1');
    // attempt to focus the last (empty, out-of-order) cell -> redirected to index 1
    all[3]!.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    await nextTick();
    expect(document.activeElement).toBe(all[1]);
    wrapper.unmount();
  });

  it('renders inputs polymorphically via as', async () => {
    const model = ref<string[] | undefined>(undefined);
    const Harness = defineComponent({
      setup: () => () => h(PinInputRoot, {
        modelValue: model.value,
        length: 2,
      }, {
        default: () => [0, 1].map(i => h(PinInputInput as Component, { key: i, index: i, as: 'input' })),
      }),
    });
    const wrapper = mount(Harness, { attachTo: document.body });
    await nextTick();
    expect(inputs().length).toBe(2);
    wrapper.unmount();
  });

  it('disabled root blocks mutation', async () => {
    const { wrapper, model } = mountPin({ disabled: true });
    await nextTick();
    const a = inputs()[0]!;
    expect(a.disabled).toBe(true);
    type(a, '5');
    await nextTick();
    expect(model.value?.[0] ?? '').toBe('');
    wrapper.unmount();
  });

  it('hides placeholder on the focused empty cell', async () => {
    const { wrapper } = mountPin({ placeholder: '○' });
    await nextTick();
    const a = inputs()[0]!;
    expect(a.getAttribute('placeholder')).toBe('○');
    a.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    await nextTick();
    expect(a.getAttribute('placeholder')).toBe('');
    a.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    await nextTick();
    expect(a.getAttribute('placeholder')).toBe('○');
    wrapper.unmount();
  });
});
