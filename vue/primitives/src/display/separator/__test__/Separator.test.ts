import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { Separator } from '../index';

describe('Separator', () => {
  let wrapper: ReturnType<typeof mount> | undefined;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  it('renders with role="separator" by default', () => {
    wrapper = mount(Separator);
    expect(wrapper.attributes('role')).toBe('separator');
    expect(wrapper.attributes('data-orientation')).toBe('horizontal');
    expect(wrapper.attributes('aria-orientation')).toBeUndefined();
  });

  it('sets aria-orientation="vertical" for vertical', () => {
    wrapper = mount(Separator, { props: { orientation: 'vertical' } });
    expect(wrapper.attributes('aria-orientation')).toBe('vertical');
    expect(wrapper.attributes('data-orientation')).toBe('vertical');
  });

  it('is decorative when requested', () => {
    wrapper = mount(Separator, { props: { decorative: true } });
    expect(wrapper.attributes('role')).toBe('none');
    expect(wrapper.attributes('aria-orientation')).toBeUndefined();
  });

  it('omits aria-orientation when decorative and vertical', () => {
    wrapper = mount(Separator, { props: { decorative: true, orientation: 'vertical' } });
    expect(wrapper.attributes('role')).toBe('none');
    expect(wrapper.attributes('aria-orientation')).toBeUndefined();
    // data-orientation still reflects the requested layout for styling hooks.
    expect(wrapper.attributes('data-orientation')).toBe('vertical');
  });

  it('supports custom element via `as`', () => {
    wrapper = mount(Separator, { props: { as: 'hr' } });
    expect(wrapper.element.tagName).toBe('HR');
  });

  describe('orientation normalization', () => {
    it('falls back to horizontal for an unexpected runtime value', () => {
      // Consumers may pass through a stringly-typed value; the rendered token
      // must remain a valid `horizontal | vertical` orientation.
      wrapper = mount(Separator, { props: { orientation: 'diagonal' as never } });
      expect(wrapper.attributes('data-orientation')).toBe('horizontal');
      expect(wrapper.attributes('aria-orientation')).toBeUndefined();
      expect(wrapper.attributes('role')).toBe('separator');
    });

    it('falls back to horizontal for nullish orientation', () => {
      wrapper = mount(Separator, { props: { orientation: undefined } });
      expect(wrapper.attributes('data-orientation')).toBe('horizontal');
    });
  });

  describe('slot-merging via as="template"', () => {
    it('merges role/data-orientation onto the consumer element instead of a wrapper', () => {
      wrapper = mount(Separator, {
        props: { as: 'template', orientation: 'vertical' },
        slots: { default: () => h('span', { class: 'custom' }, 'x') },
      });
      const el = wrapper.element as HTMLElement;
      expect(el.tagName).toBe('SPAN');
      expect(el.getAttribute('role')).toBe('separator');
      expect(el.getAttribute('aria-orientation')).toBe('vertical');
      expect(el.getAttribute('data-orientation')).toBe('vertical');
      expect(el.classList.contains('custom')).toBe(true);
    });
  });

  describe('ref / element forwarding', () => {
    it('forwards the underlying element to the parent', async () => {
      let resolved: HTMLElement | null = null;
      const Parent = defineComponent({
        setup() {
          const sep = (el: unknown) => {
            // useForwardExpose exposes the underlying element via $el.
            resolved = (el as { $el?: HTMLElement } | null)?.$el ?? null;
          };
          return () => h(Separator, { ref: sep as never, 'data-test': 'sep' });
        },
      });
      wrapper = mount(Parent, { attachTo: document.body });
      await wrapper.vm.$nextTick();
      expect(resolved).not.toBeNull();
      expect((resolved as unknown as HTMLElement).getAttribute('data-test')).toBe('sep');
    });
  });
});
