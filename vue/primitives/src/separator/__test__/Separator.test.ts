import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { Separator } from '../index';

describe('Separator', () => {
  it('renders with role="separator" by default', () => {
    const wrapper = mount(Separator);
    expect(wrapper.attributes('role')).toBe('separator');
    expect(wrapper.attributes('data-orientation')).toBe('horizontal');
    expect(wrapper.attributes('aria-orientation')).toBeUndefined();
  });

  it('sets aria-orientation="vertical" for vertical', () => {
    const wrapper = mount(Separator, { props: { orientation: 'vertical' } });
    expect(wrapper.attributes('aria-orientation')).toBe('vertical');
    expect(wrapper.attributes('data-orientation')).toBe('vertical');
  });

  it('is decorative when requested', () => {
    const wrapper = mount(Separator, { props: { decorative: true } });
    expect(wrapper.attributes('role')).toBe('none');
    expect(wrapper.attributes('aria-orientation')).toBeUndefined();
  });

  it('supports custom element via `as`', () => {
    const wrapper = mount(Separator, { props: { as: 'hr' } });
    expect(wrapper.element.tagName).toBe('HR');
  });
});
