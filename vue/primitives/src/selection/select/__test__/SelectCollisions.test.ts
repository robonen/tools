import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import type { VueWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils';
import { SelectContent, SelectItem, SelectItemText, SelectRoot, SelectTrigger, SelectViewport } from '../index';

let wrapper: VueWrapper<any> | undefined;

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = '';
});

describe('Select collision handling', () => {
  it('flips the popper list above a trigger pinned to the bottom of the viewport', async () => {
    wrapper = mount(defineComponent({
      setup: () => () => h('div', { style: 'position: fixed; left: 0; bottom: 0;' }, [
        h(SelectRoot, { defaultOpen: true }, {
          default: () => [
            h(SelectTrigger, null, () => 'open'),
            // No `avoidCollisions` here on purpose: the default must survive
            // SelectContent → SelectContentImpl → SelectPopperPosition.
            h(SelectContent, { position: 'popper', sideOffset: 4 }, () => h(SelectViewport, null, () => h(
              SelectItem,
              { value: 'a', style: 'display: block; width: 160px; height: 200px;' },
              () => h(SelectItemText, null, () => 'A'),
            ))),
          ],
        }),
      ]),
    }), { attachTo: document.body });

    await vi.waitFor(() => {
      const content = document.querySelector<HTMLElement>('[role="listbox"]');
      expect(content).toBeTruthy();
      expect(content!.getAttribute('data-side')).toBe('top');
      expect(content!.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight);
    });
  });
});
