import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { Label } from '../index';

describe('Label', () => {
  it('renders a native <label>', () => {
    const wrapper = mount(Label, { slots: { default: 'Name' } });
    expect(wrapper.element.tagName).toBe('LABEL');
    expect(wrapper.text()).toBe('Name');
  });

  it('forwards `for` to the `for` attribute', () => {
    const wrapper = mount(Label, { props: { for: 'my-input' } });
    expect(wrapper.attributes('for')).toBe('my-input');
  });

  it('prevents text selection on multi-click', () => {
    const wrapper = mount(defineComponent({
      setup: () => () => h(Label, null, { default: () => 'x' }),
    }));
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true, detail: 2 });
    wrapper.element.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('does not prevent default on single click', () => {
    const wrapper = mount(Label);
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true, detail: 1 });
    wrapper.element.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});
