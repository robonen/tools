import { PopoverContent, PopoverRoot, PopoverTrigger } from '../index';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import type { VueWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils';

let wrapper: VueWrapper<any> | undefined;

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = '';
});

describe('Popover collision handling', () => {
  it('flips above a trigger pinned to the bottom of the viewport', async () => {
    wrapper = mount(defineComponent({
      setup: () => () => h('div', { style: 'position: fixed; left: 0; bottom: 0;' }, [
        h(PopoverRoot, { defaultOpen: true }, {
          default: () => [
            h(PopoverTrigger, null, () => 'open'),
            // No `avoidCollisions` here on purpose: the default must still hold
            // after the props pass through PopoverContent → PopoverContentImpl.
            h(PopoverContent, { sideOffset: 4 }, () => h('div', { style: 'width: 120px; height: 160px;' })),
          ],
        }),
      ]),
    }), { attachTo: document.body });

    await vi.waitFor(() => {
      const content = document.querySelector<HTMLElement>('[role="dialog"]');
      expect(content).toBeTruthy();
      expect(content!.getAttribute('data-side')).toBe('top');
      expect(content!.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight);
    });
  });
});
