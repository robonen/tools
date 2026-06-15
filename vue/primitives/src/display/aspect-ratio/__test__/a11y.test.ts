import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import axe from 'axe-core';
import { AspectRatio } from '../index';

async function checkA11y(element: Element) {
  const results = await axe.run(element);

  return results.violations;
}

function createAspectRatio(props: Record<string, unknown> = {}) {
  return mount(
    defineComponent({
      setup() {
        return () =>
          h(
            AspectRatio,
            props,
            {
              default: () =>
                h('img', {
                  class: 'h-full w-full object-cover',
                  src: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
                  alt: 'Decorative placeholder',
                }),
            },
          );
      },
    }),
    { attachTo: document.body },
  );
}

describe('AspectRatio a11y', () => {
  it('has no axe violations with the default ratio', async () => {
    const wrapper = createAspectRatio();
    await nextTick();

    const violations = await checkA11y(wrapper.element);
    expect(violations).toEqual([]);

    wrapper.unmount();
  });

  it('has no axe violations with a custom ratio', async () => {
    const wrapper = createAspectRatio({ ratio: 16 / 9 });
    await nextTick();

    const violations = await checkA11y(wrapper.element);
    expect(violations).toEqual([]);

    wrapper.unmount();
  });

  it('has no axe violations when rendered as a custom element', async () => {
    const wrapper = createAspectRatio({ as: 'figure' });
    await nextTick();

    const violations = await checkA11y(wrapper.element);
    expect(violations).toEqual([]);

    wrapper.unmount();
  });
});
