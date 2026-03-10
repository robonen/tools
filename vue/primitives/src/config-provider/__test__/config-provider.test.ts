import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import {
  provideAppConfig,
  provideConfig,
  useConfig,
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
