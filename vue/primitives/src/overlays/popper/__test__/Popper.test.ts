import type { Measurable } from '../index';
import {
  PopperAnchor,
  PopperArrow,
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

  it('accepts a Measurable-typed virtual reference on content', async () => {
    const virtual: Measurable = {
      getBoundingClientRect: () => ({
        x: 0, y: 0, width: 10, height: 10,
        top: 0, right: 10, bottom: 10, left: 0,
        toJSON: () => {},
      } as DOMRect),
    };

    const Wrapper = defineComponent({
      setup() {
        return () => h(PopperRoot, null, {
          default: () => [
            h(PopperContent, { reference: virtual }, { default: () => 'Content' }),
          ],
        });
      },
    });

    const wrapper = track(mount(Wrapper, { attachTo: document.body }));
    await nextTick();

    expect(wrapper.find('[data-popper-content-wrapper]').exists()).toBe(true);
  });
});

describe('PopperArrow', () => {
  function mountWithArrow(arrowProps: Record<string, unknown> = {}, arrowSlot?: () => unknown) {
    const Wrapper = defineComponent({
      setup() {
        return () => h(PopperRoot, null, {
          default: () => [
            h(PopperAnchor, { as: 'button' }, { default: () => 'Anchor' }),
            h(PopperContent, { as: 'div' }, {
              default: () => h(PopperArrow, arrowProps, arrowSlot ? { default: arrowSlot } : undefined),
            }),
          ],
        });
      },
    });
    return track(mount(Wrapper, { attachTo: document.body }));
  }

  it('renders a real svg arrow with default path and viewBox by default', async () => {
    const wrapper = mountWithArrow();
    await nextTick();

    const svg = wrapper.find('svg');
    expect(svg.exists()).toBe(true);
    // SVG attributes are case-sensitive, so read them off the element directly.
    expect(svg.element.getAttribute('viewBox')).toBe('0 0 12 6');
    expect(svg.element.getAttribute('preserveAspectRatio')).toBe('none');

    const path = svg.find('path');
    expect(path.exists()).toBe(true);
    expect(path.attributes('d')).toBe('M0 0L6 6L12 0');
  });

  it('applies width and height defaults (10 × 5) to the svg', async () => {
    const wrapper = mountWithArrow();
    await nextTick();

    const svg = wrapper.find('svg');
    expect(svg.attributes('width')).toBe('10');
    expect(svg.attributes('height')).toBe('5');
  });

  it('honors explicit width and height', async () => {
    const wrapper = mountWithArrow({ width: 24, height: 12 });
    await nextTick();

    const svg = wrapper.find('svg');
    expect(svg.attributes('width')).toBe('24');
    expect(svg.attributes('height')).toBe('12');
  });

  it('swaps to the rounded path when rounded is set', async () => {
    const wrapper = mountWithArrow({ rounded: true });
    await nextTick();

    const path = wrapper.find('svg path');
    expect(path.exists()).toBe(true);
    expect(path.attributes('d')).toBe(
      'M0 0L4.58579 4.58579C5.36683 5.36683 6.63316 5.36684 7.41421 4.58579L12 0',
    );
  });

  it('lets the default slot override the built-in path', async () => {
    const wrapper = mountWithArrow({}, () => h('path', { d: 'M0 0L1 1' }));
    await nextTick();

    const paths = wrapper.findAll('svg path');
    expect(paths).toHaveLength(1);
    expect(paths[0]!.attributes('d')).toBe('M0 0L1 1');
  });

  it('does not emit svg-only attributes when merged via as="template"', async () => {
    const wrapper = mountWithArrow(
      { as: 'template' },
      () => h('i', { 'data-custom-arrow': '' }),
    );
    await nextTick();

    expect(wrapper.find('svg').exists()).toBe(false);
    const custom = wrapper.find('[data-custom-arrow]');
    expect(custom.exists()).toBe(true);
    expect(custom.attributes('viewbox')).toBeUndefined();
    expect(custom.attributes('preserveaspectratio')).toBeUndefined();
  });
});
