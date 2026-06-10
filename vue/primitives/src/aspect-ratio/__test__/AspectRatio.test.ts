import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { AspectRatio } from '../index';

describe('AspectRatio', () => {
  it('renders with default 1:1 ratio', () => {
    const wrapper = mount(AspectRatio);
    const outer = wrapper.element as HTMLElement;
    expect(outer.style.paddingBottom).toBe('100%');
  });

  it('computes padding-bottom from ratio', () => {
    const wrapper = mount(AspectRatio, { props: { ratio: 16 / 9 } });
    const outer = wrapper.element as HTMLElement;
    expect(outer.style.paddingBottom).toMatch(/^56\.25%$/);
  });

  it('updates padding-bottom when ratio prop changes', async () => {
    const wrapper = mount(AspectRatio, { props: { ratio: 16 / 9 } });
    const outer = wrapper.element as HTMLElement;
    expect(outer.style.paddingBottom).toBe('56.25%');

    await wrapper.setProps({ ratio: 1 });
    expect(outer.style.paddingBottom).toBe('100%');

    await wrapper.setProps({ ratio: 4 / 3 });
    expect(outer.style.paddingBottom).toBe('75%');
  });

  it('places inner element absolutely covering the wrapper', () => {
    const wrapper = mount(AspectRatio, { props: { ratio: 4 / 3 }, slots: { default: '<img />' } });
    const inner = wrapper.element.firstElementChild as HTMLElement;
    expect(inner.style.position).toBe('absolute');
    expect(inner.getAttribute('data-aspect-ratio')).toBe('true');
  });
});
