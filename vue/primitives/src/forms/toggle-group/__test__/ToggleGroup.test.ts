import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { ToggleGroupItem, ToggleGroupRoot } from '../index';

function mountGroup(opts: Record<string, unknown> = {}) {
  const model = ref<string | string[] | undefined>(undefined);
  const Harness = defineComponent({
    setup: () => () => h(ToggleGroupRoot, {
      modelValue: model.value,
      'onUpdate:modelValue': (v: string | string[] | undefined) => { model.value = v; },
      ...opts,
    }, {
      default: () => [
        h(ToggleGroupItem, { value: 'a', id: 'a' }, { default: () => 'A' }),
        h(ToggleGroupItem, { value: 'b', id: 'b' }, { default: () => 'B' }),
        h(ToggleGroupItem, { value: 'c', id: 'c', disabled: true }, { default: () => 'C' }),
      ],
    }),
  });
  return { wrapper: mount(Harness, { attachTo: document.body }), model };
}

function press(el: Element, key: string): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

describe('ToggleGroup (single)', () => {
  it('role="radiogroup" and items role="radio"', () => {
    const { wrapper } = mountGroup();
    expect(wrapper.element.getAttribute('role')).toBe('radiogroup');
    expect(document.querySelectorAll('[role="radio"]')).toHaveLength(3);
    wrapper.unmount();
  });

  it('click selects; clicking selected deselects', async () => {
    const { wrapper, model } = mountGroup();
    await nextTick();
    const a = document.querySelector<HTMLButtonElement>('#a')!;
    a.click();
    await nextTick();
    expect(model.value).toBe('a');
    expect(a.getAttribute('aria-checked')).toBe('true');
    a.click();
    await nextTick();
    expect(model.value).toBeUndefined();
    wrapper.unmount();
  });

  it('selecting another replaces', async () => {
    const { wrapper, model } = mountGroup({ defaultValue: 'a' });
    await nextTick();
    const b = document.querySelector<HTMLButtonElement>('#b')!;
    b.click();
    await nextTick();
    expect(model.value).toBe('b');
    wrapper.unmount();
  });

  it('ArrowRight cycles focus (roving)', async () => {
    const { wrapper } = mountGroup();
    await nextTick();
    const a = document.querySelector<HTMLButtonElement>('#a')!;
    const b = document.querySelector<HTMLButtonElement>('#b')!;
    a.focus();
    press(a, 'ArrowRight');
    await nextTick();
    expect(document.activeElement).toBe(b);
    wrapper.unmount();
  });

  it('disabled item aria-disabled=true, not toggleable', async () => {
    const { wrapper, model } = mountGroup();
    await nextTick();
    const c = document.querySelector<HTMLButtonElement>('#c')!;
    expect(c.getAttribute('aria-disabled')).toBe('true');
    c.click();
    await nextTick();
    expect(model.value).toBeUndefined();
    wrapper.unmount();
  });
});

describe('ToggleGroup (multiple)', () => {
  it('role="group" and items with aria-pressed', async () => {
    const { wrapper, model } = mountGroup({ type: 'multiple' });
    await nextTick();
    expect(wrapper.element.getAttribute('role')).toBe('group');
    const a = document.querySelector<HTMLButtonElement>('#a')!;
    const b = document.querySelector<HTMLButtonElement>('#b')!;
    a.click();
    await nextTick();
    expect(a.getAttribute('aria-pressed')).toBe('true');
    expect(model.value).toEqual(['a']);
    b.click();
    await nextTick();
    expect(model.value).toEqual(['a', 'b']);
    // Toggle off a:
    a.click();
    await nextTick();
    expect(model.value).toEqual(['b']);
    wrapper.unmount();
  });
});
