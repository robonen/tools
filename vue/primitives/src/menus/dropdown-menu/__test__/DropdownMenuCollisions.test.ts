import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import type { VueWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils';
import { DropdownMenuContent, DropdownMenuRoot, DropdownMenuTrigger } from '../index';

let wrapper: VueWrapper<any> | undefined;

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = '';
});

describe('DropdownMenu collision handling', () => {
  it('flips above a trigger pinned to the bottom of the viewport', async () => {
    wrapper = mount(defineComponent({
      setup: () => () => h('div', { style: 'position: fixed; left: 0; bottom: 0;' }, [
        h(DropdownMenuRoot, { defaultOpen: true }, {
          default: () => [
            h(DropdownMenuTrigger, null, () => 'open'),
            // No `avoidCollisions` here on purpose: the default must survive
            // DropdownMenuContent → MenuContent → MenuRootContent* → MenuContentImpl.
            h(DropdownMenuContent, { sideOffset: 4 }, () => h('div', { style: 'width: 160px; height: 200px;' })),
          ],
        }),
      ]),
    }), { attachTo: document.body });

    await vi.waitFor(() => {
      const content = document.querySelector<HTMLElement>('[data-primitives-menu-content]');
      expect(content).toBeTruthy();
      expect(content!.getAttribute('data-side')).toBe('top');
      expect(content!.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight);
    });
  });
});
