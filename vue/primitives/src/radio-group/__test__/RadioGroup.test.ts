import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from '../index';

function mountGroup(opts: Record<string, unknown> = {}) {
  const model = ref<string | undefined>(undefined);
  const Harness = defineComponent({
    setup: () => () => h(RadioGroupRoot, {
      modelValue: model.value,
      'onUpdate:modelValue': (v: string | undefined) => { model.value = v; },
      ...opts,
    }, {
      default: () => [
        h(RadioGroupItem, { value: 'a', id: 'a' }, { default: () => h(RadioGroupIndicator) }),
        h(RadioGroupItem, { value: 'b', id: 'b' }, { default: () => h(RadioGroupIndicator) }),
        h(RadioGroupItem, { value: 'c', id: 'c', disabled: true }, { default: () => h(RadioGroupIndicator) }),
      ],
    }),
  });
  return { wrapper: mount(Harness, { attachTo: document.body }), model };
}

function press(el: Element, key: string): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

describe('RadioGroup', () => {
  it('renders role="radiogroup" and items with role="radio"', () => {
    const { wrapper } = mountGroup();
    const root = wrapper.element as HTMLElement;
    expect(root.getAttribute('role')).toBe('radiogroup');
    expect(document.querySelectorAll('[role="radio"]')).toHaveLength(3);
    wrapper.unmount();
  });

  it('click selects and emits valueChange', async () => {
    const { wrapper, model } = mountGroup();
    await nextTick();
    const a = document.querySelector<HTMLButtonElement>('#a')!;
    a.click();
    await nextTick();
    expect(model.value).toBe('a');
    expect(a.getAttribute('aria-checked')).toBe('true');
    wrapper.unmount();
  });

  it('ArrowDown moves focus+selection to next enabled item', async () => {
    const { wrapper, model } = mountGroup({ defaultValue: 'a' });
    await nextTick();
    const a = document.querySelector<HTMLButtonElement>('#a')!;
    const b = document.querySelector<HTMLButtonElement>('#b')!;
    a.focus();
    press(a, 'ArrowDown');
    await nextTick();
    expect(document.activeElement).toBe(b);
    expect(model.value).toBe('b');
    wrapper.unmount();
  });

  it('skips disabled items on arrow', async () => {
    const { wrapper, model } = mountGroup({ defaultValue: 'b' });
    await nextTick();
    const b = document.querySelector<HTMLButtonElement>('#b')!;
    const a = document.querySelector<HTMLButtonElement>('#a')!;
    b.focus();
    press(b, 'ArrowDown');
    await nextTick();
    // Loops past disabled 'c' to 'a'
    expect(document.activeElement).toBe(a);
    expect(model.value).toBe('a');
    wrapper.unmount();
  });

  it('only checked (or first enabled) has tabindex 0', async () => {
    const { wrapper } = mountGroup();
    await nextTick();
    const [a, b] = document.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    expect(a!.tabIndex).toBe(0);
    expect(b!.tabIndex).toBe(-1);
    a!.click();
    await nextTick();
    expect(a!.tabIndex).toBe(0);
    wrapper.unmount();
  });

  it('disabled item: aria-disabled=true, not clickable', async () => {
    const { wrapper, model } = mountGroup();
    await nextTick();
    const c = document.querySelector<HTMLButtonElement>('#c')!;
    expect(c.getAttribute('aria-disabled')).toBe('true');
    c.click();
    await nextTick();
    expect(model.value).toBeUndefined();
    wrapper.unmount();
  });

  it('RadioGroupIndicator renders only for checked item', async () => {
    const { wrapper } = mountGroup({ defaultValue: 'b' });
    await nextTick();
    const b = document.querySelector<HTMLButtonElement>('#b')!;
    expect(b.querySelector('span')).toBeTruthy();
    const a = document.querySelector<HTMLButtonElement>('#a')!;
    expect(a.querySelector('span')).toBeNull();
    wrapper.unmount();
  });

  it('Space selects the focused item', async () => {
    const { wrapper, model } = mountGroup();
    await nextTick();
    const b = document.querySelector<HTMLButtonElement>('#b')!;
    b.focus();
    press(b, ' ');
    await nextTick();
    expect(model.value).toBe('b');
    wrapper.unmount();
  });
});
