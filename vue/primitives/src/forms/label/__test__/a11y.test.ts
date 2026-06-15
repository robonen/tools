import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import axe from 'axe-core';
import { Label } from '../index';

async function checkA11y(element: Element) {
  const results = await axe.run(element);

  return results.violations;
}

function createLabelledField(props: Record<string, unknown> = {}) {
  return mount(
    defineComponent({
      setup() {
        return () =>
          h('div', [
            h(Label, { for: 'input', ...props }, { default: () => 'Name' }),
            h('input', { id: 'input', type: 'text' }),
          ]);
      },
    }),
    { attachTo: document.body },
  );
}

describe('Label a11y', () => {
  it('has no axe violations when associated with a native control', async () => {
    const wrapper = createLabelledField();
    await nextTick();

    const violations = await checkA11y(wrapper.element);
    expect(violations).toEqual([]);

    wrapper.unmount();
  });

  it('has no axe violations when wrapping a control', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h('div', [
              h(Label, null, {
                default: () => [
                  'Subscribe',
                  h('input', { id: 'checkbox', type: 'checkbox' }),
                ],
              }),
            ]);
        },
      }),
      { attachTo: document.body },
    );
    await nextTick();

    const violations = await checkA11y(wrapper.element);
    expect(violations).toEqual([]);

    wrapper.unmount();
  });
});
