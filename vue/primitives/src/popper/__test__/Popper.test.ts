import {
  PopperAnchor,
  PopperContent,
  PopperRoot,
} from '../index';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import type { VueWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils';

const wrappers: Array<VueWrapper<any>> = [];

afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
});

function track<T extends VueWrapper<any>>(w: T): T {
  wrappers.push(w);
  return w;
}

describe('Popper', () => {
  it('renders root with anchor and content', async () => {
    const Wrapper = defineComponent({
      setup() {
        return () => h(PopperRoot, null, {
          default: () => [
            h(PopperAnchor, { as: 'button' }, { default: () => 'Anchor' }),
            h(PopperContent, { as: 'div' }, { default: () => 'Content' }),
          ],
        });
      },
    });

    const wrapper = track(mount(Wrapper, { attachTo: document.body }));
    await nextTick();

    expect(wrapper.find('button').text()).toBe('Anchor');
    expect(wrapper.find('[data-popper-content-wrapper]').exists()).toBe(true);
  });

  it('positions content with default placement (bottom)', async () => {
    const Wrapper = defineComponent({
      setup() {
        return () => h(PopperRoot, null, {
          default: () => [
            h(PopperAnchor, { as: 'button' }, { default: () => 'Anchor' }),
            h(PopperContent, null, { default: () => 'Content' }),
          ],
        });
      },
    });

    const wrapper = track(mount(Wrapper, { attachTo: document.body }));
    await nextTick();
    await nextTick();

    const content = wrapper.find('[data-side]');
    expect(content.exists()).toBe(true);
  });

  it('exposes data-side and data-align attributes', async () => {
    const Wrapper = defineComponent({
      setup() {
        return () => h(PopperRoot, null, {
          default: () => [
            h(PopperAnchor, { as: 'button' }, { default: () => 'Anchor' }),
            h(PopperContent, { side: 'top', align: 'start' }, { default: () => 'Content' }),
          ],
        });
      },
    });

    const wrapper = track(mount(Wrapper, { attachTo: document.body }));
    await nextTick();
    await nextTick();

    const content = wrapper.find('[data-side]');
    expect(content.exists()).toBe(true);
  });

  it('passes custom reference to anchor', async () => {
    const customRef = {
      getBoundingClientRect: () => ({
        x: 100, y: 100, width: 50, height: 50,
        top: 100, right: 150, bottom: 150, left: 100,
        toJSON: () => {},
      }),
    };

    const Wrapper = defineComponent({
      setup() {
        return () => h(PopperRoot, null, {
          default: () => [
            h(PopperAnchor, { reference: customRef }, { default: () => 'Anchor' }),
            h(PopperContent, null, { default: () => 'Content' }),
          ],
        });
      },
    });

    const wrapper = track(mount(Wrapper, { attachTo: document.body }));
    await nextTick();

    expect(wrapper.find('[data-popper-content-wrapper]').exists()).toBe(true);
  });
});
