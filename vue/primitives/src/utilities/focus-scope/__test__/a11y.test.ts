import { defineComponent, h, nextTick } from 'vue';
import { describe, expect, it } from 'vitest';
import FocusScope from '../FocusScope.vue';
import axe from 'axe-core';
import { mount } from '@vue/test-utils';

async function checkA11y(element: Element) {
  const results = await axe.run(element);
  return results.violations;
}

function createFocusScope(props: Record<string, unknown> = {}) {
  return mount(
    defineComponent({
      setup() {
        return () =>
          h(
            FocusScope,
            props,
            {
              default: () => [
                h('button', { type: 'button' }, 'First'),
                h('button', { type: 'button' }, 'Second'),
                h('button', { type: 'button' }, 'Third'),
              ],
            },
          );
      },
    }),
    { attachTo: document.body },
  );
}

describe('FocusScope a11y', () => {
  it('has no axe violations with default props', async () => {
    const wrapper = createFocusScope();
    await nextTick();
    await nextTick();

    const violations = await checkA11y(wrapper.element);
    expect(violations).toEqual([]);

    wrapper.unmount();
  });

  it('has no axe violations with loop enabled', async () => {
    const wrapper = createFocusScope({ loop: true });
    await nextTick();
    await nextTick();

    const violations = await checkA11y(wrapper.element);
    expect(violations).toEqual([]);

    wrapper.unmount();
  });

  it('has no axe violations with trapped enabled', async () => {
    const wrapper = createFocusScope({ trapped: true });
    await nextTick();
    await nextTick();

    const violations = await checkA11y(wrapper.element);
    expect(violations).toEqual([]);

    wrapper.unmount();
  });
});
