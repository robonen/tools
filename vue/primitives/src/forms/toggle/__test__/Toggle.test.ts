import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { computed, defineComponent, h, nextTick, ref, shallowRef } from 'vue';
import { Toggle } from '../index';
import { provideToggleGroupContext } from '../../toggle-group/context';

describe('Toggle', () => {
  it('defaults to unpressed and toggles on click', async () => {
    const wrapper = mount(Toggle);
    expect(wrapper.attributes('aria-pressed')).toBe('false');
    expect(wrapper.attributes('data-state')).toBe('off');
    await wrapper.trigger('click');
    expect(wrapper.attributes('aria-pressed')).toBe('true');
    expect(wrapper.attributes('data-state')).toBe('on');
  });

  it('respects defaultPressed', () => {
    const wrapper = mount(Toggle, { props: { defaultPressed: true } });
    expect(wrapper.attributes('aria-pressed')).toBe('true');
  });

  it('syncs with v-model', async () => {
    const pressed = ref(false);
    const wrapper = mount(Toggle, {
      props: { pressed: pressed.value, 'onUpdate:pressed': (v: boolean) => { pressed.value = v; } },
    });
    await wrapper.trigger('click');
    expect(pressed.value).toBe(true);
  });

  it('does not toggle when disabled', async () => {
    const wrapper = mount(Toggle, { props: { disabled: true } });
    await wrapper.trigger('click');
    expect(wrapper.attributes('aria-pressed')).toBe('false');
    expect(wrapper.attributes('data-disabled')).toBe('');
  });

  it('sets type="button" on button element', () => {
    const wrapper = mount(Toggle);
    expect(wrapper.attributes('type')).toBe('button');
  });

  describe('keyboard activation', () => {
    it('toggles on Space when as is not a button', async () => {
      const wrapper = mount(Toggle, { props: { as: 'div' } });
      await wrapper.trigger('keydown', { key: ' ' });
      expect(wrapper.attributes('aria-pressed')).toBe('true');
      await wrapper.trigger('keydown', { key: ' ' });
      expect(wrapper.attributes('aria-pressed')).toBe('false');
    });

    it('toggles on Enter when as is not a button', async () => {
      const wrapper = mount(Toggle, { props: { as: 'div' } });
      await wrapper.trigger('keydown', { key: 'Enter' });
      expect(wrapper.attributes('aria-pressed')).toBe('true');
    });

    it('ignores other keys', async () => {
      const wrapper = mount(Toggle, { props: { as: 'div' } });
      await wrapper.trigger('keydown', { key: 'a' });
      await wrapper.trigger('keydown', { key: 'Tab' });
      expect(wrapper.attributes('aria-pressed')).toBe('false');
    });

    it('does not synthesize keyboard toggle on native button', async () => {
      const wrapper = mount(Toggle);
      await wrapper.trigger('keydown', { key: ' ' });
      expect(wrapper.attributes('aria-pressed')).toBe('false');
    });

    it('does not toggle on keyboard when disabled (as=div)', async () => {
      const wrapper = mount(Toggle, { props: { as: 'div', disabled: true } });
      await wrapper.trigger('keydown', { key: ' ' });
      await wrapper.trigger('keydown', { key: 'Enter' });
      expect(wrapper.attributes('aria-pressed')).toBe('false');
    });
  });

  describe('non-button host (as="div")', () => {
    it('sets aria-disabled when disabled', () => {
      const wrapper = mount(Toggle, { props: { as: 'div', disabled: true } });
      expect(wrapper.attributes('aria-disabled')).toBe('true');
    });

    it('does not set aria-disabled when enabled', () => {
      const wrapper = mount(Toggle, { props: { as: 'div' } });
      expect(wrapper.attributes('aria-disabled')).toBeUndefined();
    });

    it('has tabindex=0 when enabled, -1 when disabled', () => {
      const enabled = mount(Toggle, { props: { as: 'div' } });
      expect(enabled.attributes('tabindex')).toBe('0');
      const disabled = mount(Toggle, { props: { as: 'div', disabled: true } });
      expect(disabled.attributes('tabindex')).toBe('-1');
    });

    it('button host has no synthesized tabindex', () => {
      const wrapper = mount(Toggle);
      expect(wrapper.attributes('tabindex')).toBeUndefined();
    });
  });

  describe('slot scope', () => {
    it('exposes pressed, disabled and state', async () => {
      const seen: Array<{ pressed: boolean; disabled: boolean; state: string }> = [];
      const wrapper = mount(Toggle, {
        props: { disabled: false },
        slots: {
          default: (scope: { pressed: boolean; disabled: boolean; state: string }) => {
            seen.push({ pressed: scope.pressed, disabled: scope.disabled, state: scope.state });
            return scope.state;
          },
        },
      });
      expect(seen.at(-1)).toEqual({ pressed: false, disabled: false, state: 'off' });
      await wrapper.trigger('click');
      expect(seen.at(-1)).toEqual({ pressed: true, disabled: false, state: 'on' });
      wrapper.unmount();
    });

    it('exposes disabled=true in scope when disabled', () => {
      let scopeDisabled: boolean | undefined;
      const wrapper = mount(Toggle, {
        props: { disabled: true },
        slots: {
          default: (scope: { disabled: boolean }) => {
            scopeDisabled = scope.disabled;
            return '';
          },
        },
      });
      expect(scopeDisabled).toBe(true);
      wrapper.unmount();
    });
  });

  describe('form integration', () => {
    function mountInForm(props: Record<string, unknown>) {
      const Host = defineComponent({
        props: ['toggleProps'],
        setup(p) {
          return () => h('form', {}, [h(Toggle, p.toggleProps as Record<string, unknown>)]);
        },
      });
      return mount(Host, { props: { toggleProps: props }, attachTo: document.body });
    }

    it('renders a hidden checkbox input inside a form when name is set', async () => {
      const wrapper = mountInForm({ name: 'bold', defaultPressed: true });
      await nextTick();
      const input = wrapper.find('input[type="checkbox"]');
      expect(input.exists()).toBe(true);
      expect(input.attributes('name')).toBe('bold');
      expect((input.element as HTMLInputElement).checked).toBe(true);
      wrapper.unmount();
    });

    it('does not render a hidden input without a name', () => {
      const wrapper = mountInForm({ defaultPressed: true });
      expect(wrapper.find('input').exists()).toBe(false);
      wrapper.unmount();
    });

    it('does not render a hidden input outside a form', () => {
      const wrapper = mount(Toggle, { props: { name: 'bold' }, attachTo: document.body });
      expect(wrapper.find('input').exists()).toBe(false);
      wrapper.unmount();
    });

    it('hidden input reflects unchecked state and required flag', async () => {
      const wrapper = mountInForm({ name: 'bold', required: true });
      await nextTick();
      const input = wrapper.find('input[type="checkbox"]');
      expect(input.exists()).toBe(true);
      expect((input.element as HTMLInputElement).checked).toBe(false);
      expect(input.attributes('required')).toBeDefined();
      wrapper.unmount();
    });

    it('submits a custom value when pressed', async () => {
      const wrapper = mountInForm({ name: 'bold', value: 'enabled' });
      await nextTick();
      const toggle = wrapper.findComponent(Toggle);
      await toggle.trigger('click');
      const input = wrapper.find('input[type="checkbox"]');
      expect(input.attributes('value')).toBe('enabled');
      wrapper.unmount();
    });
  });

  describe('toggle-group awareness', () => {
    it('suppresses its own hidden input when a ToggleGroup context is present', async () => {
      // A minimal provider stands in for ToggleGroupRoot: Toggle only checks for
      // the presence of the context to decide whether to suppress its own input.
      const GroupProvider = defineComponent({
        setup(_, { slots }) {
          provideToggleGroupContext({
            type: ref('single'),
            value: shallowRef([]),
            toggle: () => {},
            isPressed: () => false,
            orientation: ref('horizontal'),
            direction: ref('ltr'),
            loop: ref(true),
            disabled: ref(false),
            rovingFocus: ref(true),
            items: computed(() => []),
            onItemKeyDown: () => {},
          });
          return () => slots.default?.();
        },
      });
      const Host = defineComponent({
        setup() {
          return () => h('form', {}, [
            h(GroupProvider, {}, {
              default: () => h(Toggle, { name: 'bold', defaultPressed: true }),
            }),
          ]);
        },
      });
      const wrapper = mount(Host, { attachTo: document.body });
      await nextTick();
      // The nested Toggle must not render its own form input — the group owns it.
      const namedBold = wrapper.findAll('input').filter(i => i.attributes('name') === 'bold');
      expect(namedBold.length).toBe(0);
      wrapper.unmount();
    });
  });

  it('exports an emits-typed update:pressed event', async () => {
    const wrapper = mount(Toggle);
    await wrapper.trigger('click');
    expect(wrapper.emitted('update:pressed')).toEqual([[true]]);
    wrapper.unmount();
  });
});
