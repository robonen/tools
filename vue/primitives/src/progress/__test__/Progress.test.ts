import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { ProgressIndicator, ProgressRoot } from '../index';

function mountProgress(props: Record<string, unknown> = {}) {
  return mount(defineComponent({
    setup: () => () => h(ProgressRoot, props, { default: () => h(ProgressIndicator, { class: 'ind' }) }),
  }));
}

describe('Progress', () => {
  it('has role="progressbar" with aria attributes', () => {
    const wrapper = mountProgress({ modelValue: 40 });
    expect(wrapper.attributes('role')).toBe('progressbar');
    expect(wrapper.attributes('aria-valuemin')).toBe('0');
    expect(wrapper.attributes('aria-valuemax')).toBe('100');
    expect(wrapper.attributes('aria-valuenow')).toBe('40');
    expect(wrapper.attributes('aria-valuetext')).toBe('40%');
  });

  it('is indeterminate when value is null', () => {
    const wrapper = mountProgress({ modelValue: null });
    expect(wrapper.attributes('data-state')).toBe('indeterminate');
    expect(wrapper.attributes('aria-valuenow')).toBeUndefined();
  });

  it('is complete when value reaches max', () => {
    const wrapper = mountProgress({ modelValue: 100 });
    expect(wrapper.attributes('data-state')).toBe('complete');
  });

  it('custom max', () => {
    const wrapper = mountProgress({ modelValue: 5, max: 10 });
    expect(wrapper.attributes('aria-valuemax')).toBe('10');
    expect(wrapper.attributes('aria-valuetext')).toBe('50%');
  });

  it('indicator receives matching data-state', () => {
    const wrapper = mountProgress({ modelValue: 70 });
    const ind = wrapper.find('.ind');
    expect(ind.attributes('data-state')).toBe('loading');
    expect(ind.attributes('data-value')).toBe('70');
  });

  it('getValueLabel override', () => {
    const wrapper = mountProgress({ modelValue: 3, max: 10, getValueLabel: (v: number, m: number) => `${v} of ${m}` });
    expect(wrapper.attributes('aria-valuetext')).toBe('3 of 10');
  });
});
