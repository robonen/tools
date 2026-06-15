import { afterEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import axe from 'axe-core';
import { Separator } from '../index';

async function violations(element: Element) {
  const results = await axe.run(element);
  return results.violations;
}

describe('Separator a11y', () => {
  let wrapper: ReturnType<typeof mount> | undefined;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  it('has no axe violations when horizontal', async () => {
    wrapper = mount(Separator, { attachTo: document.body });
    expect(await violations(wrapper.element)).toHaveLength(0);
  });

  it('has no axe violations when vertical', async () => {
    wrapper = mount(Separator, { props: { orientation: 'vertical' }, attachTo: document.body });
    expect(await violations(wrapper.element)).toHaveLength(0);
  });

  it('has no axe violations when decorative', async () => {
    wrapper = mount(Separator, { props: { decorative: true }, attachTo: document.body });
    expect(await violations(wrapper.element)).toHaveLength(0);
  });
});
