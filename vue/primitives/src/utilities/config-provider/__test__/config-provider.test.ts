import { describe, expect, it } from 'vitest';
import { computed, defineComponent, h, nextTick, ref, shallowRef } from 'vue';
import { mount } from '@vue/test-utils';
import {
  nativeDateAdapter,
  provideAppConfig,
  provideConfig,
  useConfig,
  useDateAdapter,
  useDirection,
  useId,
  useLocale,
  useNonce,
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

// --- new global fields: locale / nonce / scrollBody ---

describe('config fields (locale / nonce / scrollBody)', () => {
  function renderConfig() {
    const Child = defineComponent({
      setup() {
        const config = useConfig();
        return { config };
      },
      render() {
        return h('div', {
          'data-locale': this.config.locale.value,
          'data-nonce': this.config.nonce.value ?? '',
          'data-scroll': JSON.stringify(this.config.scrollBody.value),
        });
      },
    });
    return Child;
  }

  it('exposes documented defaults when no provider exists', () => {
    const wrapper = mount(renderConfig());
    const div = wrapper.find('div');
    expect(div.attributes('data-locale')).toBe('en');
    expect(div.attributes('data-nonce')).toBe('');
    expect(div.attributes('data-scroll')).toBe('true');
    wrapper.unmount();
  });

  it('inherits custom locale / nonce / scrollBody from provideConfig', () => {
    const Child = renderConfig();
    const Parent = defineComponent({
      setup() {
        provideConfig({
          locale: 'fr',
          nonce: 'abc123',
          scrollBody: { padding: 20, margin: 0 },
        });
      },
      render() {
        return h(Child);
      },
    });

    const wrapper = mount(Parent);
    const div = wrapper.find('div');
    expect(div.attributes('data-locale')).toBe('fr');
    expect(div.attributes('data-nonce')).toBe('abc123');
    expect(div.attributes('data-scroll')).toBe('{"padding":20,"margin":0}');
    wrapper.unmount();
  });

  it('supports scrollBody=false', () => {
    const Child = renderConfig();
    const Parent = defineComponent({
      setup() {
        provideConfig({ scrollBody: false });
      },
      render() {
        return h(Child);
      },
    });

    const wrapper = mount(Parent);
    expect(wrapper.find('div').attributes('data-scroll')).toBe('false');
    wrapper.unmount();
  });
});

// --- reactivity preservation (the fixed defect) ---

describe('reactive source preservation', () => {
  it('stays live when dir is provided as a ref', async () => {
    const source = ref<'ltr' | 'rtl'>('ltr');

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
        provideConfig({ dir: source });
      },
      render() {
        return h(Child);
      },
    });

    const wrapper = mount(Parent);
    expect(wrapper.find('div').attributes('data-dir')).toBe('ltr');

    source.value = 'rtl';
    await nextTick();
    expect(wrapper.find('div').attributes('data-dir')).toBe('rtl');

    wrapper.unmount();
  });

  it('stays live when locale is provided as a getter', async () => {
    const source = ref('en');

    const Child = defineComponent({
      setup() {
        const config = useConfig();
        return { config };
      },
      render() {
        return h('div', { 'data-locale': this.config.locale.value });
      },
    });

    const Parent = defineComponent({
      setup() {
        provideConfig({ locale: () => source.value });
      },
      render() {
        return h(Child);
      },
    });

    const wrapper = mount(Parent);
    expect(wrapper.find('div').attributes('data-locale')).toBe('en');

    source.value = 'de';
    await nextTick();
    expect(wrapper.find('div').attributes('data-locale')).toBe('de');

    wrapper.unmount();
  });

  it('teleportTarget getter stays live and resolves default', async () => {
    const source = ref<string>('body');

    const Child = defineComponent({
      setup() {
        const config = useConfig();
        return { config };
      },
      render() {
        return h('div', { 'data-target': this.config.teleportTarget.value });
      },
    });

    const Parent = defineComponent({
      setup() {
        provideConfig({ teleportTarget: () => source.value });
      },
      render() {
        return h(Child);
      },
    });

    const wrapper = mount(Parent);
    expect(wrapper.find('div').attributes('data-target')).toBe('body');

    source.value = '#app';
    await nextTick();
    expect(wrapper.find('div').attributes('data-target')).toBe('#app');

    wrapper.unmount();
  });
});

// --- resolver composables ---

describe('useDirection / useLocale / useNonce', () => {
  it('useDirection prefers local override over config and default', () => {
    const A = defineComponent({
      setup() {
        const dir = useDirection();
        return { dir };
      },
      render() {
        return h('div', { 'data-dir': this.dir });
      },
    });
    const B = defineComponent({
      setup() {
        const dir = useDirection('rtl');
        return { dir };
      },
      render() {
        return h('div', { 'data-dir': this.dir });
      },
    });

    const noProvider = mount(A);
    expect(noProvider.find('div').attributes('data-dir')).toBe('ltr');
    noProvider.unmount();

    const Parent = defineComponent({
      setup() {
        provideConfig({ dir: 'rtl' });
      },
      render() {
        return h(A);
      },
    });
    const inherited = mount(Parent);
    expect(inherited.find('div').attributes('data-dir')).toBe('rtl');
    inherited.unmount();

    const override = mount(B);
    expect(override.find('div').attributes('data-dir')).toBe('rtl');
    override.unmount();
  });

  it('useLocale prefers local override, then config, then en', () => {
    const Local = defineComponent({
      setup() {
        const locale = useLocale('it');
        return { locale };
      },
      render() {
        return h('div', { 'data-locale': this.locale });
      },
    });
    const wrapper = mount(Local);
    expect(wrapper.find('div').attributes('data-locale')).toBe('it');
    wrapper.unmount();

    const Inherited = defineComponent({
      setup() {
        const locale = useLocale();
        return { locale };
      },
      render() {
        return h('div', { 'data-locale': this.locale });
      },
    });
    const Parent = defineComponent({
      setup() {
        provideConfig({ locale: 'es' });
      },
      render() {
        return h(Inherited);
      },
    });
    const w2 = mount(Parent);
    expect(w2.find('div').attributes('data-locale')).toBe('es');
    w2.unmount();
  });

  it('useNonce prefers local override, then config', () => {
    const Inherited = defineComponent({
      setup() {
        const nonce = useNonce();
        return { nonce };
      },
      render() {
        return h('div', { 'data-nonce': this.nonce ?? '' });
      },
    });
    const Parent = defineComponent({
      setup() {
        provideConfig({ nonce: 'cfg-nonce' });
      },
      render() {
        return h(Inherited);
      },
    });
    const w = mount(Parent);
    expect(w.find('div').attributes('data-nonce')).toBe('cfg-nonce');
    w.unmount();

    const Local = defineComponent({
      setup() {
        const nonce = useNonce('local-nonce');
        return { nonce };
      },
      render() {
        return h('div', { 'data-nonce': this.nonce ?? '' });
      },
    });
    const Parent2 = defineComponent({
      setup() {
        provideConfig({ nonce: 'cfg-nonce' });
      },
      render() {
        return h(Local);
      },
    });
    const w2 = mount(Parent2);
    expect(w2.find('div').attributes('data-nonce')).toBe('local-nonce');
    w2.unmount();

    const NoConfig = defineComponent({
      setup() {
        const nonce = useNonce();
        return { nonce };
      },
      render() {
        return h('div', { 'data-nonce': this.nonce ?? 'none' });
      },
    });
    const w3 = mount(NoConfig);
    expect(w3.find('div').attributes('data-nonce')).toBe('none');
    w3.unmount();
  });
});

// --- dateAdapter config + useDateAdapter resolver ---

describe('dateAdapter / useDateAdapter', () => {
  it('exposes the native date adapter by default', () => {
    const Child = defineComponent({
      setup() {
        const config = useConfig();
        const adapter = useDateAdapter();
        return { config, adapter };
      },
      render() {
        return h('div', {
          'data-config-native': this.config.dateAdapter.value === nativeDateAdapter,
          'data-resolved-native': this.adapter === nativeDateAdapter,
        });
      },
    });

    const wrapper = mount(Child);
    expect(wrapper.find('div').attributes('data-config-native')).toBe('true');
    expect(wrapper.find('div').attributes('data-resolved-native')).toBe('true');
    wrapper.unmount();
  });

  it('inherits a custom adapter from provideConfig', () => {
    const customAdapter = { ...nativeDateAdapter };

    const Child = defineComponent({
      setup() {
        const adapter = useDateAdapter();
        return { adapter };
      },
      render() {
        return h('div', { 'data-custom': this.adapter === customAdapter });
      },
    });

    const Parent = defineComponent({
      setup() {
        provideConfig({ dateAdapter: customAdapter });
      },
      render() {
        return h(Child);
      },
    });

    const wrapper = mount(Parent);
    expect(wrapper.find('div').attributes('data-custom')).toBe('true');
    wrapper.unmount();
  });

  it('prefers a per-call override over config and the native default', () => {
    const configAdapter = { ...nativeDateAdapter };
    const overrideAdapter = { ...nativeDateAdapter };

    const Child = defineComponent({
      setup() {
        const adapter = useDateAdapter(overrideAdapter);
        return { adapter };
      },
      render() {
        return h('div', { 'data-override': this.adapter === overrideAdapter });
      },
    });

    const Parent = defineComponent({
      setup() {
        provideConfig({ dateAdapter: configAdapter });
      },
      render() {
        return h(Child);
      },
    });

    const wrapper = mount(Parent);
    expect(wrapper.find('div').attributes('data-override')).toBe('true');
    wrapper.unmount();
  });

  it('stays live when the config adapter is a ref', async () => {
    const a = { ...nativeDateAdapter };
    const b = { ...nativeDateAdapter };
    // shallowRef: an adapter is an opaque object — deep-reactivizing it (plain
    // `ref`) would wrap it in a proxy and break identity comparison.
    const source = shallowRef(a);

    const Child = defineComponent({
      setup() {
        const adapter = useDateAdapter();
        return { adapter };
      },
      render() {
        return h('div', { 'data-which': this.adapter === a ? 'a' : 'b' });
      },
    });

    const Parent = defineComponent({
      setup() {
        provideConfig({ dateAdapter: source });
      },
      render() {
        return h(Child);
      },
    });

    const wrapper = mount(Parent);
    expect(wrapper.find('div').attributes('data-which')).toBe('a');

    source.value = b;
    await nextTick();
    expect(wrapper.find('div').attributes('data-which')).toBe('b');

    wrapper.unmount();
  });
});
