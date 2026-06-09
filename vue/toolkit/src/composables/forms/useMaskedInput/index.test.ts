import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { maskNumberOptions } from '../mask';
import type { MaskOptionInput } from '../mask';
import { useMaskedInput } from './index';
import type { UseMaskedInputReturn } from './index';

function mountInput(mask: MaskOptionInput): {
  api: UseMaskedInputReturn;
  input: HTMLInputElement;
  unmount: () => void;
} {
  let api!: UseMaskedInputReturn;
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useMaskedInput({ mask });
        return () => h('input', api.bind as unknown as Record<string, unknown>);
      },
    }),
    { attachTo: document.body },
  );

  return { api, input: wrapper.element as HTMLInputElement, unmount: () => wrapper.unmount() };
}

describe(useMaskedInput, () => {
  it('binds the element via `bind` and conforms through ensureFitsMask', () => {
    const { api, input, unmount } = mountInput('+1 (###) ###-####');

    input.value = '1234567890';
    api.ensureFitsMask();

    expect(input.value).toBe('+1 (123) 456-7890');
    expect(api.unmasked.value).toBe('1234567890');
    expect(api.complete.value).toBeTruthy();

    unmount();
  });

  it('masks a real beforeinput dispatched on the bound element', () => {
    const { input, unmount } = mountInput('+1 (###) ###-####');

    input.focus();
    input.value = '+1 (12';
    input.setSelectionRange(6, 6);

    const event = new InputEvent('beforeinput', { inputType: 'insertText', data: '3', cancelable: true });
    input.dispatchEvent(event);

    expect(input.value).toBe('+1 (123) ');
    expect(event.defaultPrevented).toBeTruthy();

    unmount();
  });

  it('re-conforms on the input event (fallback path)', () => {
    const { api, input, unmount } = mountInput('+1 (###) ###-####');

    input.value = '99';
    input.dispatchEvent(new Event('input'));

    expect(input.value).toBe('+1 (99');
    expect(api.unmasked.value).toBe('99');

    unmount();
  });

  it('sets the value programmatically via setValue', () => {
    const { api, input, unmount } = mountInput('+1 (###) ###-####');

    api.setValue('5551234567');

    expect(input.value).toBe('+1 (555) 123-4567');
    expect(api.unmasked.value).toBe('5551234567');

    unmount();
  });

  it('reports the raw value of a number mask through onAccept-fed refs', async () => {
    const { api, input, unmount } = mountInput(maskNumberOptions({ thousandSeparator: ',' }));
    await nextTick();

    input.value = '1234567';
    input.dispatchEvent(new Event('input'));

    expect(input.value).toBe('1,234,567');
    expect(api.unmasked.value).toBe('1234567');

    unmount();
  });
});
