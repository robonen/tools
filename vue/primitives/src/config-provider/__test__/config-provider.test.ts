import { describe, expect, it } from 'vitest';
import { computed, defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import {
  provideAppConfig,
  provideConfig,
  useConfig,
  useId,
} from '..';

// --- useConfig ---

describe('useConfig', () => {
  it('returns default config when no provider exists', () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          const config = useConfig();
          return { config };
        },
        render() {
          return h('div', {
            'data-dir': this.config.dir.value,
            'data-target': this.config.teleportTarget.value,
          });
        },
      }),
    );

    expect(wrapper.find('div').attributes('data-dir')).toBe('ltr');
    expect(wrapper.find('div').attributes('data-target')).toBe('body');

    wrapper.unmount();
  });

  it('returns custom config from provideConfig', () => {
    const Child = defineComponent({
      setup() {
        const config = useConfig();
        return { config };
      },
      render() {
        return h('div', {
          'data-dir': this.config.dir.value,
          'data-target': this.config.teleportTarget.value,
        });
      },
    });

    const Parent = defineComponent({
      setup() {
        provideConfig({
          dir: 'rtl',
          teleportTarget: '#app',
        });
      },
      render() {
        return h(Child);
      },
    });

    const wrapper = mount(Parent);

    expect(wrapper.find('div').attributes('data-dir')).toBe('rtl');
    expect(wrapper.find('div').attributes('data-target')).toBe('#app');

    wrapper.unmount();
  });

  it('exposes mutable refs for runtime updates', async () => {
    const Child = defineComponent({
      setup() {
        const config = useConfig();
        return { config };
      },
      render() {
        return h('div', { 'data-dir': this.config.dir.value });
      },
    });

    const Parent = defineComponent({
      setup() {
        const config = provideConfig({ dir: 'ltr' });
        return { config };
      },
      render() {
        return h(Child);
      },
    });

    const wrapper = mount(Parent);
    expect(wrapper.find('div').attributes('data-dir')).toBe('ltr');

    wrapper.vm.config.dir.value = 'rtl';
    await wrapper.vm.$nextTick();

    expect(wrapper.find('div').attributes('data-dir')).toBe('rtl');

    wrapper.unmount();
  });
});

// --- provideAppConfig ---

describe('provideAppConfig', () => {
  it('provides config at app level', () => {
    const Child = defineComponent({
      setup() {
        const config = useConfig();
        return { config };
      },
      render() {
        return h('div', {
          'data-dir': this.config.dir.value,
        });
      },
    });

    const wrapper = mount(Child, {
      global: {
        plugins: [
          app => provideAppConfig(app, { dir: 'rtl' }),
        ],
      },
    });

    expect(wrapper.find('div').attributes('data-dir')).toBe('rtl');

    wrapper.unmount();
  });
});

// --- useId override ---

describe('useId (config override)', () => {
  it('uses the toolkit fallback when no override is provided', () => {
    const Child = defineComponent({
      setup() {
        const id = useId();
        return { id };
      },
      render() {
        return h('div', { 'data-id': this.id });
      },
    });

    const wrapper = mount(Child);
    expect(wrapper.find('div').attributes('data-id')).toMatch(/^robonen-/);
    wrapper.unmount();
  });

  it('routes through a provided useId override', () => {
    let count = 0;
    const customUseId = (_deterministic?: unknown, prefix = 'x') => {
      count += 1;
      const n = count;
      return computed(() => `${prefix}-${n}`);
    };

    const Child = defineComponent({
      setup() {
        const a = useId();
        const b = useId(undefined, 'custom');
        return { a, b };
      },
      render() {
        return h('div', { 'data-a': this.a, 'data-b': this.b });
      },
    });

    const wrapper = mount(Child, {
      global: {
        plugins: [app => provideAppConfig(app, { useId: customUseId })],
      },
    });

    expect(wrapper.find('div').attributes('data-a')).toBe('x-1');
    expect(wrapper.find('div').attributes('data-b')).toBe('custom-2');
    wrapper.unmount();
  });

  it('respects deterministic id passed through the override', () => {
    const Child = defineComponent({
      setup() {
        const id = useId(() => 'fixed-id');
        return { id };
      },
      render() {
        return h('div', { 'data-id': this.id });
      },
    });

    const wrapper = mount(Child);
    expect(wrapper.find('div').attributes('data-id')).toBe('fixed-id');
    wrapper.unmount();
  });
});
