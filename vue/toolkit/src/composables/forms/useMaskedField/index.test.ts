import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { maskNumberOptions } from '../mask';
import { useMaskedField } from './index';
import type { UseMaskedFieldOptions, UseMaskedFieldReturn } from './index';

function mountField(options: UseMaskedFieldOptions): {
  field: UseMaskedFieldReturn;
  input: HTMLInputElement;
  unmount: () => void;
} {
  let field!: UseMaskedFieldReturn;
  const wrapper = mount(
    defineComponent({
      setup() {
        field = useMaskedField('phone', options);
        return () => h('input', field.bind.value as Record<string, unknown>);
      },
    }),
    { attachTo: document.body },
  );

  return { field, input: wrapper.element as HTMLInputElement, unmount: () => wrapper.unmount() };
}

describe(useMaskedField, () => {
  it('shows the masked value but stores the raw value in the field', async () => {
    const { field, input, unmount } = mountField({ mask: '+1 (###) ###-####', initialValue: '' });

    input.value = '1234567890';
    input.dispatchEvent(new Event('input'));
    await nextTick();

    expect(field.display.value).toBe('+1 (123) 456-7890');
    expect(field.unmasked.value).toBe('1234567890');
    expect(field.value.value).toBe('1234567890');
    expect(field.complete.value).toBeTruthy();

    unmount();
  });

  it('stores the masked value when modelValue is "masked"', async () => {
    const { field, input, unmount } = mountField({
      mask: maskNumberOptions({ thousandSeparator: ',' }),
      modelValue: 'masked',
      initialValue: '',
    });

    input.value = '1234567';
    input.dispatchEvent(new Event('input'));
    await nextTick();

    expect(field.display.value).toBe('1,234,567');
    expect(field.value.value).toBe('1,234,567');

    unmount();
  });

  it('re-seeds the input when the field value is set programmatically', async () => {
    const { field, input, unmount } = mountField({ mask: '+1 (###) ###-####', initialValue: '' });

    field.setValue('5551234567');
    await nextTick();

    expect(field.display.value).toBe('+1 (555) 123-4567');
    expect(input.value).toBe('+1 (555) 123-4567');

    unmount();
  });
});
