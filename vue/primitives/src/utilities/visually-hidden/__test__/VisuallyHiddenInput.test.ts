import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import VisuallyHiddenInput from '../VisuallyHiddenInput.vue';
import VisuallyHiddenInputBubble from '../VisuallyHiddenInputBubble.vue';

function inputs(el: Element): HTMLInputElement[] {
  return Array.from(el.querySelectorAll('input')) as HTMLInputElement[];
}

describe('VisuallyHiddenInput', () => {
  let wrapper: ReturnType<typeof mount> | undefined;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  it('renders a single hidden input for a primitive value', () => {
    wrapper = mount(VisuallyHiddenInput, {
      attachTo: document.body,
      props: { name: 'color', value: 'red' },
    });

    const all = inputs(wrapper.element.parentElement!);
    expect(all).toHaveLength(1);
    expect(all[0]!.name).toBe('color');
    expect(all[0]!.value).toBe('red');
  });

  it('hides the input from layout and the accessibility tree by default', () => {
    wrapper = mount(VisuallyHiddenInput, {
      attachTo: document.body,
      props: { name: 'color', value: 'red' },
    });

    const input = inputs(wrapper.element.parentElement!)[0]!;
    expect(input.style.position).toBe('absolute');
    expect(input.getAttribute('aria-hidden')).toBe('true');
    expect(input.getAttribute('tabindex')).toBe('-1');
    expect(input.getAttribute('data-visually-hidden')).toBe('hidden');
  });

  it('serializes an array of primitives to name[index]', () => {
    wrapper = mount(VisuallyHiddenInput, {
      attachTo: document.body,
      props: { name: 'tags', value: ['a', 'b', 'c'] },
    });

    const all = inputs(wrapper.element.parentElement!);
    expect(all.map(i => i.name)).toEqual(['tags[0]', 'tags[1]', 'tags[2]']);
    expect(all.map(i => i.value)).toEqual(['a', 'b', 'c']);
  });

  it('serializes an array of objects to name[index][key]', () => {
    wrapper = mount(VisuallyHiddenInput, {
      attachTo: document.body,
      props: { name: 'items', value: [{ id: 1, label: 'x' }, { id: 2, label: 'y' }] },
    });

    const all = inputs(wrapper.element.parentElement!);
    expect(all.map(i => i.name)).toEqual([
      'items[0][id]',
      'items[0][label]',
      'items[1][id]',
      'items[1][label]',
    ]);
    expect(all.map(i => i.value)).toEqual(['1', 'x', '2', 'y']);
  });

  it('serializes a plain object to name[key]', () => {
    wrapper = mount(VisuallyHiddenInput, {
      attachTo: document.body,
      props: { name: 'coords', value: { x: 10, y: 20 } },
    });

    const all = inputs(wrapper.element.parentElement!);
    expect(all.map(i => i.name)).toEqual(['coords[x]', 'coords[y]']);
    expect(all.map(i => i.value)).toEqual(['10', '20']);
  });

  it('renders nothing for an empty, non-required array', () => {
    wrapper = mount(VisuallyHiddenInput, {
      attachTo: document.body,
      props: { name: 'tags', value: [] },
    });

    expect(inputs(wrapper.element.parentElement!)).toHaveLength(0);
  });

  it('renders one required input for an empty required array (native validation fires)', () => {
    wrapper = mount(VisuallyHiddenInput, {
      attachTo: document.body,
      props: { name: 'tags', value: [], required: true },
    });

    const all = inputs(wrapper.element.parentElement!);
    expect(all).toHaveLength(1);
    expect(all[0]!.name).toBe('tags');
    expect(all[0]!.required).toBe(true);
  });

  it('forwards required and disabled to every leaf input', () => {
    wrapper = mount(VisuallyHiddenInput, {
      attachTo: document.body,
      props: { name: 'tags', value: ['a', 'b'], required: true, disabled: true },
    });

    for (const input of inputs(wrapper.element.parentElement!)) {
      expect(input.required).toBe(true);
      expect(input.disabled).toBe(true);
    }
  });

  it('updates the rendered inputs when the array value changes', async () => {
    wrapper = mount(VisuallyHiddenInput, {
      attachTo: document.body,
      props: { name: 'tags', value: ['a'] },
    });

    expect(inputs(wrapper.element.parentElement!)).toHaveLength(1);

    await wrapper.setProps({ value: ['a', 'b'] });
    await nextTick();

    const all = inputs(wrapper.element.parentElement!);
    expect(all.map(i => i.name)).toEqual(['tags[0]', 'tags[1]']);
  });
});

describe('VisuallyHiddenInputBubble', () => {
  let wrapper: ReturnType<typeof mount> | undefined;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  it('renders a hidden text input mirroring the value', () => {
    wrapper = mount(VisuallyHiddenInputBubble, {
      attachTo: document.body,
      props: { name: 'q', value: 'hello' },
    });

    const input = wrapper.element as HTMLInputElement;
    expect(input.tagName).toBe('INPUT');
    expect(input.type).toBe('text');
    expect(input.name).toBe('q');
    expect(input.value).toBe('hello');
  });

  it('renders a checkbox-style input when checked is provided', () => {
    wrapper = mount(VisuallyHiddenInputBubble, {
      attachTo: document.body,
      props: { name: 'agree', value: 'on', checked: true },
    });

    const input = wrapper.element as HTMLInputElement;
    expect(input.type).toBe('checkbox');
    expect(input.checked).toBe(true);
  });

  it('dispatches bubbling input and change events when the value changes programmatically', async () => {
    const onInput = vi.fn();
    const onChange = vi.fn();
    document.body.addEventListener('input', onInput);
    document.body.addEventListener('change', onChange);

    wrapper = mount(VisuallyHiddenInputBubble, {
      attachTo: document.body,
      props: { name: 'q', value: 'a' },
    });

    onInput.mockClear();
    onChange.mockClear();

    await wrapper.setProps({ value: 'b' });
    await nextTick();

    expect((wrapper.element as HTMLInputElement).value).toBe('b');
    expect(onInput).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledTimes(1);

    document.body.removeEventListener('input', onInput);
    document.body.removeEventListener('change', onChange);
  });

  it('dispatches change events when the checked state changes programmatically', async () => {
    const onChange = vi.fn();
    document.body.addEventListener('change', onChange);

    wrapper = mount(VisuallyHiddenInputBubble, {
      attachTo: document.body,
      props: { name: 'agree', value: 'on', checked: false },
    });

    onChange.mockClear();

    await wrapper.setProps({ checked: true });
    await nextTick();

    expect((wrapper.element as HTMLInputElement).checked).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);

    document.body.removeEventListener('change', onChange);
  });

  it('does not dispatch when the value is unchanged', async () => {
    const onChange = vi.fn();
    document.body.addEventListener('change', onChange);

    wrapper = mount(VisuallyHiddenInputBubble, {
      attachTo: document.body,
      props: { name: 'q', value: 'a' },
    });

    onChange.mockClear();

    await wrapper.setProps({ value: 'a' });
    await nextTick();

    expect(onChange).not.toHaveBeenCalled();

    document.body.removeEventListener('change', onChange);
  });
});
