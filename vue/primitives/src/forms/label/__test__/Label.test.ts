import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { Label } from '../index';

let mounted: ReturnType<typeof mount> | undefined;

afterEach(() => {
  mounted?.unmount();
  mounted = undefined;
});

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

  it('renders nothing extra with neither slot nor `for`', () => {
    const wrapper = mount(Label);
    expect(wrapper.html()).toBe('<label></label>');
  });

  it('renders `for` together with slot content', () => {
    const wrapper = mount(Label, { props: { for: 'input' }, slots: { default: 'Name' } });
    expect(wrapper.html()).toBe('<label for="input">Name</label>');
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

  it('does not re-prevent default when already prevented', () => {
    const wrapper = mount(Label);
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true, detail: 3 });
    event.preventDefault();
    wrapper.element.dispatchEvent(event);
    // Stays prevented but the handler short-circuits on defaultPrevented.
    expect(event.defaultPrevented).toBe(true);
  });

  describe('polymorphism', () => {
    it('renders as a custom element via `as`', () => {
      const wrapper = mount(Label, { props: { as: 'span' }, slots: { default: 'Name' } });
      expect(wrapper.element.tagName).toBe('SPAN');
      expect(wrapper.text()).toBe('Name');
    });

    it('merges behaviour onto the slotted child via as="template"', () => {
      // as="template" is this package's composition mechanism: the label's
      // props (for) and listeners (mousedown) are merged onto the single
      // slotted child instead of rendering an extra wrapper element.
      const wrapper = mount(Label, {
        props: { as: 'template', for: 'merged' },
        slots: { default: () => h('button', { type: 'button' }, 'Pick') },
      });
      expect(wrapper.element.tagName).toBe('BUTTON');
      expect(wrapper.attributes('for')).toBe('merged');
    });

    it('forwards mousedown handling through as="template"', () => {
      const wrapper = mount(defineComponent({
        setup: () => () => h(Label, { as: 'template' }, {
          default: () => h('span', null, 'x'),
        }),
      }));
      const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true, detail: 2 });
      wrapper.element.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe('control association edge cases', () => {
    it('does not move focus when clicked without a `for`', async () => {
      const wrapper = mount(defineComponent({
        setup: () => () => h('div', [
          h(Label, null, { default: () => 'Name' }),
          h('input', { id: 'input' }),
        ]),
      }), { attachTo: document.body });
      mounted = wrapper;

      wrapper.element.querySelector('label')!.click();
      await nextTick();

      expect(document.activeElement).not.toBe(wrapper.element.querySelector('input'));
    });

    it('does not move focus when `for` points to a missing id', async () => {
      const wrapper = mount(defineComponent({
        setup: () => () => h('div', [
          h(Label, { for: 'missing' }, { default: () => 'Name' }),
          h('input', { id: 'present' }),
        ]),
      }), { attachTo: document.body });
      mounted = wrapper;

      wrapper.element.querySelector('label')!.click();
      await nextTick();

      expect(document.activeElement).not.toBe(wrapper.element.querySelector('input'));
    });
  });

  describe('ref forwarding', () => {
    it('exposes the underlying element via forwardRef', () => {
      const wrapper = mount(Label, { props: { for: 'x' }, slots: { default: 'Name' } });
      const exposed = wrapper.vm.$el as HTMLElement;
      expect(exposed.tagName).toBe('LABEL');
    });
  });
});
