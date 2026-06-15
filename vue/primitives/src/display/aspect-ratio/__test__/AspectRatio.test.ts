import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
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

  it('renders the inner element with a custom `as` tag', () => {
    const wrapper = mount(AspectRatio, { props: { as: 'section' } });
    const inner = wrapper.element.firstElementChild as HTMLElement;
    expect(inner.tagName).toBe('SECTION');
    expect(inner.getAttribute('data-aspect-ratio')).toBe('true');
  });

  it('exposes resolved ratio and aspect to the default slot', () => {
    const wrapper = mount(AspectRatio, {
      props: { ratio: 16 / 9 },
      slots: {
        default: `<template #default="{ ratio, aspect }"><span class="slot">{{ ratio }}|{{ aspect }}</span></template>`,
      },
    });

    const span = wrapper.find('.slot');
    expect(span.exists()).toBe(true);
    const [ratio, aspect] = span.text().split('|').map(Number);
    expect(ratio).toBeCloseTo(16 / 9);
    expect(aspect).toBeCloseTo(56.25);
  });

  it('updates the slot props reactively when ratio changes', async () => {
    const wrapper = mount(AspectRatio, {
      props: { ratio: 1 },
      slots: {
        default: `<template #default="{ aspect }"><span class="slot">{{ aspect }}</span></template>`,
      },
    });

    expect(wrapper.find('.slot').text()).toBe('100');

    await wrapper.setProps({ ratio: 4 });
    await nextTick();
    expect(wrapper.find('.slot').text()).toBe('25');
  });

  it('handles extreme ratios without breaking the layout reservation', () => {
    const tall = mount(AspectRatio, { props: { ratio: 1 / 4 } });
    expect((tall.element as HTMLElement).style.paddingBottom).toBe('400%');

    const wide = mount(AspectRatio, { props: { ratio: 100 } });
    expect((wide.element as HTMLElement).style.paddingBottom).toBe('1%');
  });
});
