import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { defineComponent, h, nextTick, ref } from 'vue';

import {
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxTrigger,
  ComboboxViewport,
} from '../index';

function mountCombobox() {
  const search = ref('');
  const Harness = defineComponent({
    setup: () => () => h(ComboboxRoot, { defaultOpen: true, multiple: false }, {
      default: () => [
        h(ComboboxTrigger, { id: 'trigger' }, {
          default: () => h(ComboboxInput, {
            id: 'input',
            'onUpdate:searchTerm': (v: string) => { search.value = v; },
          }),
        }),
        h(ComboboxPortal, {}, {
          default: () => h(ComboboxContent, {}, {
            default: () => h(ComboboxViewport, {}, {
              default: () => [
                h(ComboboxItem, { value: 'apple', textValue: 'Apple' }, { default: () => 'Apple' }),
                h(ComboboxItem, { value: 'banana', textValue: 'Banana' }, { default: () => 'Banana' }),
                h(ComboboxItem, { value: 'cherry', textValue: 'Cherry' }, { default: () => 'Cherry' }),
              ],
            }),
          }),
        }),
      ],
    }),
  });
  return { wrapper: mount(Harness, { attachTo: document.body }), search };
}

function getLiveRegion(): HTMLElement | null {
  return document.querySelector('[data-primitives-combobox-announce]');
}

describe('Combobox — filtered-results live region', () => {
  it('announces "N results available." reflecting the unfiltered count on open', async () => {
    const { wrapper } = mountCombobox();
    await nextTick();
    await nextTick();
    await nextTick();
    const live = getLiveRegion();
    expect(live).toBeTruthy();
    expect(live!.getAttribute('role')).toBe('status');
    expect(live!.getAttribute('aria-live')).toBe('polite');
    expect(live!.textContent?.trim()).toBe('3 results available.');
    wrapper.unmount();
  });

  it('updates the count as the search term filters items', async () => {
    const { wrapper } = mountCombobox();
    await nextTick();
    await nextTick();
    await nextTick();
    const input = document.querySelector<HTMLInputElement>('#input')!;
    await userEvent.click(input);
    await userEvent.type(input, 'app');
    await nextTick();
    await nextTick();
    expect(getLiveRegion()!.textContent?.trim()).toBe('1 result available.');

    await userEvent.clear(input);
    await userEvent.type(input, 'zz');
    await nextTick();
    await nextTick();
    expect(getLiveRegion()!.textContent?.trim()).toBe('0 results available.');
    wrapper.unmount();
  });
});
