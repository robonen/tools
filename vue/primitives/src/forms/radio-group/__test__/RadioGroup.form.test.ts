import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';

import { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from '../index';

function mountInForm(props: Record<string, unknown> = {}) {
  const model = ref<string | undefined>(undefined);
  const submitted = ref<FormData | null>(null);
  const Harness = defineComponent({
    setup: () => () => h(
      'form',
      {
        onSubmit: (e: SubmitEvent) => {
          e.preventDefault();
          submitted.value = new FormData(e.target as HTMLFormElement);
        },
      },
      [
        h(RadioGroupRoot, {
          modelValue: model.value,
          'onUpdate:modelValue': (v: string | undefined) => { model.value = v; },
          ...props,
        }, {
          default: () => [
            h(RadioGroupItem, { value: 'apple', id: 'a' }, { default: () => h(RadioGroupIndicator) }),
            h(RadioGroupItem, { value: 'banana', id: 'b' }, { default: () => h(RadioGroupIndicator) }),
          ],
        }),
        h('button', { type: 'submit', id: 'submit' }, 'Submit'),
      ],
    ),
  });
  return { wrapper: mount(Harness, { attachTo: document.body }), model, submitted };
}

describe('RadioGroup — form submission', () => {
  it('does not render a hidden input when `name` is omitted', async () => {
    const { wrapper } = mountInForm();
    await nextTick();
    expect(wrapper.element.querySelector('input[type="radio"]')).toBeNull();
    wrapper.unmount();
  });

  it('renders a hidden, accessibility-hidden input when `name` is set', async () => {
    const { wrapper } = mountInForm({ name: 'fruit' });
    await nextTick();
    const input = wrapper.element.querySelector('input[type="radio"][name="fruit"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.getAttribute('aria-hidden')).toBe('true');
    expect(input.tabIndex).toBe(-1);
    wrapper.unmount();
  });

  it('hidden input forwards the selected value into FormData on submit', async () => {
    const { wrapper, submitted } = mountInForm({ name: 'fruit' });
    await nextTick();
    document.querySelector<HTMLButtonElement>('#a')!.click();
    await nextTick();
    (wrapper.element as HTMLFormElement).requestSubmit();
    await nextTick();
    expect(submitted.value).not.toBeNull();
    expect(submitted.value!.get('fruit')).toBe('apple');
    wrapper.unmount();
  });

  it('hidden input mirrors `required`/`disabled`', async () => {
    const { wrapper } = mountInForm({ name: 'fruit', required: true, disabled: true });
    await nextTick();
    const input = wrapper.element.querySelector('input[type="radio"][name="fruit"]') as HTMLInputElement;
    expect(input.required).toBe(true);
    expect(input.disabled).toBe(true);
    wrapper.unmount();
  });
});
