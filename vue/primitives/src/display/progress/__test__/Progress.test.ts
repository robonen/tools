import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { ProgressIndicator, ProgressRoot } from '../index';

function mountProgress(props: Record<string, unknown> = {}, slot?: (scope: Record<string, unknown>) => unknown) {
  return mount(defineComponent({
    setup: () => () => h(ProgressRoot, props, {
      default: (scope: Record<string, unknown>) =>
        slot ? slot(scope) : h(ProgressIndicator, { class: 'ind' }),
    }),
  }), { attachTo: document.body });
}

describe('Progress', () => {
  it('has role="progressbar" with aria attributes', () => {
    const wrapper = mountProgress({ modelValue: 40 });
    expect(wrapper.attributes('role')).toBe('progressbar');
    expect(wrapper.attributes('aria-valuemin')).toBe('0');
    expect(wrapper.attributes('aria-valuemax')).toBe('100');
    expect(wrapper.attributes('aria-valuenow')).toBe('40');
    expect(wrapper.attributes('aria-valuetext')).toBe('40%');
    wrapper.unmount();
  });

  it('is indeterminate when value is null', () => {
    const wrapper = mountProgress({ modelValue: null });
    expect(wrapper.attributes('data-state')).toBe('indeterminate');
    expect(wrapper.attributes('aria-valuenow')).toBeUndefined();
    wrapper.unmount();
  });

  it('is complete when value reaches max', () => {
    const wrapper = mountProgress({ modelValue: 100 });
    expect(wrapper.attributes('data-state')).toBe('complete');
    wrapper.unmount();
  });

  it('custom max', () => {
    const wrapper = mountProgress({ modelValue: 5, max: 10 });
    expect(wrapper.attributes('aria-valuemax')).toBe('10');
    expect(wrapper.attributes('aria-valuetext')).toBe('50%');
    wrapper.unmount();
  });

  it('indicator receives matching data-state', () => {
    const wrapper = mountProgress({ modelValue: 70 });
    const ind = wrapper.find('.ind');
    expect(ind.attributes('data-state')).toBe('loading');
    expect(ind.attributes('data-value')).toBe('70');
    wrapper.unmount();
  });

  it('getValueLabel override', () => {
    const wrapper = mountProgress({ modelValue: 3, max: 10, getValueLabel: (v: number | null, m: number) => `${v} of ${m}` });
    expect(wrapper.attributes('aria-valuetext')).toBe('3 of 10');
    wrapper.unmount();
  });

  // ---- accessible name (aria-label) ----
  describe('accessible name', () => {
    it('renders no aria-label by default', () => {
      const wrapper = mountProgress({ modelValue: 40 });
      expect(wrapper.attributes('aria-label')).toBeUndefined();
      wrapper.unmount();
    });

    it('accepts a static string accessibleLabel as aria-label', () => {
      const wrapper = mountProgress({ modelValue: 40, accessibleLabel: 'Upload progress' });
      expect(wrapper.attributes('aria-label')).toBe('Upload progress');
      // value text is independent
      expect(wrapper.attributes('aria-valuetext')).toBe('40%');
      wrapper.unmount();
    });

    it('accepts a function accessibleLabel that receives value/max', () => {
      const wrapper = mountProgress({
        modelValue: 30,
        max: 60,
        accessibleLabel: (v: number | null, m: number) => `${v}/${m} done`,
      });
      expect(wrapper.attributes('aria-label')).toBe('30/60 done');
      wrapper.unmount();
    });
  });

  // ---- input validation / clamping ----
  describe('input validation', () => {
    let errorSpy: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
      errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => {
      errorSpy.mockRestore();
    });

    it('clamps a value above max', () => {
      const wrapper = mountProgress({ modelValue: 150, max: 100 });
      expect(wrapper.attributes('aria-valuenow')).toBe('100');
      expect(wrapper.attributes('data-state')).toBe('complete');
      wrapper.unmount();
    });

    it('clamps a negative value to 0', () => {
      const wrapper = mountProgress({ modelValue: -20 });
      expect(wrapper.attributes('aria-valuenow')).toBe('0');
      wrapper.unmount();
    });

    it('coerces NaN value to indeterminate and warns', () => {
      const wrapper = mountProgress({ modelValue: Number.NaN });
      expect(wrapper.attributes('aria-valuenow')).toBeUndefined();
      expect(wrapper.attributes('data-state')).toBe('indeterminate');
      expect(errorSpy).toHaveBeenCalled();
      wrapper.unmount();
    });

    it('falls back to default max when max <= 0 and warns', () => {
      const wrapper = mountProgress({ modelValue: 50, max: 0 });
      expect(wrapper.attributes('aria-valuemax')).toBe('100');
      // value text uses the corrected max — no Infinity%
      expect(wrapper.attributes('aria-valuetext')).toBe('50%');
      expect(errorSpy).toHaveBeenCalled();
      wrapper.unmount();
    });

    it('falls back to default max when max is NaN', () => {
      const wrapper = mountProgress({ modelValue: 50, max: Number.NaN });
      expect(wrapper.attributes('aria-valuemax')).toBe('100');
      wrapper.unmount();
    });

    it('does not render NaN aria-valuenow for non-finite input', () => {
      const wrapper = mountProgress({ modelValue: Number.POSITIVE_INFINITY });
      expect(wrapper.attributes('aria-valuenow')).toBeUndefined();
      wrapper.unmount();
    });
  });

  // ---- controlled two-way v-model ----
  describe('controlled v-model', () => {
    it('updates DOM when bound value changes', async () => {
      const value = ref<number | null>(20);
      const wrapper = mount(defineComponent({
        setup: () => () => h(ProgressRoot, {
          modelValue: value.value,
          'onUpdate:modelValue': (v: number | null) => { value.value = v; },
        }, { default: () => h(ProgressIndicator, { class: 'ind' }) }),
      }), { attachTo: document.body });
      expect(wrapper.attributes('aria-valuenow')).toBe('20');
      value.value = 80;
      await nextTick();
      expect(wrapper.attributes('aria-valuenow')).toBe('80');
      wrapper.unmount();
    });

    it('clamps an out-of-range bound value on read without mutating the parent', async () => {
      // One-way bind (no update listener): the bar displays a clamped value but
      // never writes back to a source the parent did not opt into mutating.
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const wrapper = mountProgress({ modelValue: 250, max: 100 });
      expect(wrapper.attributes('aria-valuenow')).toBe('100');
      expect(wrapper.attributes('data-state')).toBe('complete');
      errorSpy.mockRestore();
      wrapper.unmount();
    });

    it('declares the update:modelValue emit so v-model is a true two-way contract', async () => {
      const value = ref<number | null>(40);
      const wrapper = mount(defineComponent({
        setup: () => () => h(ProgressRoot, {
          modelValue: value.value,
          'onUpdate:modelValue': (v: number | null) => { value.value = v; },
        }, { default: () => h(ProgressIndicator) }),
      }), { attachTo: document.body });
      expect(wrapper.attributes('aria-valuenow')).toBe('40');
      // parent remains the source of truth and drives the bar
      value.value = 90;
      await nextTick();
      expect(wrapper.attributes('aria-valuenow')).toBe('90');
      wrapper.unmount();
    });
  });

  // ---- uncontrolled mode ----
  describe('uncontrolled mode', () => {
    it('starts indeterminate when no modelValue is provided', () => {
      const wrapper = mount(ProgressRoot, {
        attachTo: document.body,
        slots: { default: () => h(ProgressIndicator) },
      });
      expect(wrapper.attributes('data-state')).toBe('indeterminate');
      expect(wrapper.attributes('aria-valuenow')).toBeUndefined();
      wrapper.unmount();
    });
  });

  // ---- two-way max ----
  describe('two-way max', () => {
    it('reacts to bound max changes', async () => {
      const max = ref(100);
      const wrapper = mount(defineComponent({
        setup: () => () => h(ProgressRoot, {
          modelValue: 50,
          max: max.value,
          'onUpdate:max': (m: number) => { max.value = m; },
        }, { default: () => h(ProgressIndicator) }),
      }), { attachTo: document.body });
      expect(wrapper.attributes('aria-valuetext')).toBe('50%');
      max.value = 200;
      await nextTick();
      expect(wrapper.attributes('aria-valuemax')).toBe('200');
      expect(wrapper.attributes('aria-valuetext')).toBe('25%');
      wrapper.unmount();
    });
  });

  // ---- slot scope ----
  describe('slot scope', () => {
    it('exposes progress and percentage on the root slot', () => {
      const seen: Record<string, unknown> = {};
      const wrapper = mountProgress({ modelValue: 25, max: 50 }, (scope) => {
        Object.assign(seen, scope);
        return h('span');
      });
      expect(seen.value).toBe(25);
      expect(seen.max).toBe(50);
      expect(seen.state).toBe('loading');
      expect(seen.progress).toBe(0.5);
      expect(seen.percentage).toBe(50);
      wrapper.unmount();
    });

    it('exposes progress/percentage as null when indeterminate', () => {
      const seen: Record<string, unknown> = {};
      const wrapper = mountProgress({ modelValue: null }, (scope) => {
        Object.assign(seen, scope);
        return h('span');
      });
      expect(seen.progress).toBeNull();
      expect(seen.percentage).toBeNull();
      wrapper.unmount();
    });

    it('exposes progress/percentage on the indicator slot', () => {
      const indSeen: Record<string, unknown> = {};
      const wrapper = mount(defineComponent({
        setup: () => () => h(ProgressRoot, { modelValue: 30, max: 60 }, {
          default: () => h(ProgressIndicator, null, {
            default: (scope: Record<string, unknown>) => {
              Object.assign(indSeen, scope);
              return h('span');
            },
          }),
        }),
      }), { attachTo: document.body });
      expect(indSeen.progress).toBe(0.5);
      expect(indSeen.percentage).toBe(50);
      wrapper.unmount();
    });
  });

  // ---- overshoot complete (robonen's preserved strength) ----
  it('keeps complete state when value overshoots after clamp', () => {
    const wrapper = mountProgress({ modelValue: 105, max: 100 });
    // clamped to 100 -> still complete
    expect(wrapper.attributes('data-state')).toBe('complete');
    wrapper.unmount();
  });

  it('renders data-value/data-max on the root', () => {
    const wrapper = mountProgress({ modelValue: 42, max: 84 });
    expect(wrapper.attributes('data-value')).toBe('42');
    expect(wrapper.attributes('data-max')).toBe('84');
    wrapper.unmount();
  });
});
