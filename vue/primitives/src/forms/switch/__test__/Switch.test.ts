import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { Switch } from '../index';

describe('switch (generic)', () => {
  describe('boolean (default)', () => {
    it('has role="switch" and toggles on click', async () => {
      const wrapper = mount(Switch);
      expect(wrapper.attributes('role')).toBe('switch');
      expect(wrapper.attributes('aria-checked')).toBe('false');
      await wrapper.trigger('click');
      expect(wrapper.attributes('aria-checked')).toBe('true');
      expect(wrapper.attributes('data-state')).toBe('checked');
    });

    it('respects defaultValue', () => {
      const wrapper = mount(Switch, { props: { defaultValue: true } });
      expect(wrapper.attributes('aria-checked')).toBe('true');
    });

    it('renders a hidden input when name is provided', () => {
      const wrapper = mount(Switch, { props: { name: 'agree', defaultValue: true } });
      const input = wrapper.find('input[type="checkbox"]');
      expect(input.exists()).toBe(true);
      expect(input.attributes('name')).toBe('agree');
      expect(input.attributes('value')).toBe('true');
      expect((input.element as HTMLInputElement).checked).toBe(true);
    });

    it('does not render input without name', () => {
      const wrapper = mount(Switch);
      expect(wrapper.find('input').exists()).toBe(false);
    });

    it('skips toggle when disabled', async () => {
      const wrapper = mount(Switch, { props: { disabled: true } });
      await wrapper.trigger('click');
      expect(wrapper.attributes('aria-checked')).toBe('false');
    });

    it('sets aria-required when required', () => {
      const wrapper = mount(Switch, { props: { required: true } });
      expect(wrapper.attributes('aria-required')).toBe('true');
    });
  });

  describe('string pair ("on" / "off")', () => {
    it('derives checked via Object.is with truthy', async () => {
      const wrapper = mount(Switch, { props: { truthy: 'on', falsy: 'off' } });
      expect(wrapper.attributes('aria-checked')).toBe('false');
      await wrapper.trigger('click');
      expect(wrapper.attributes('aria-checked')).toBe('true');
    });

    it('hidden input serializes to current truthy/falsy', async () => {
      const wrapper = mount(Switch, {
        props: { truthy: 'on', falsy: 'off', name: 'mode', defaultValue: 'on' },
      });
      const input = wrapper.find('input[type="checkbox"]');
      expect(input.attributes('value')).toBe('on');
      await wrapper.trigger('click');
      expect(wrapper.find('input[type="checkbox"]').attributes('value')).toBe('off');
    });

    it('v-model emits truthy/falsy, not booleans', async () => {
      const parent = defineComponent({
        components: { Switch },
        setup() {
          const val = ref<'on' | 'off'>('off');
          return { val };
        },
        render() {
          return h(Switch, {
            truthy: 'on',
            falsy: 'off',
            modelValue: this.val,
            'onUpdate:modelValue': (v: unknown) => { this.val = v as 'on' | 'off'; },
          });
        },
      });
      const wrapper = mount(parent);
      await wrapper.find('[role="switch"]').trigger('click');
      expect(wrapper.vm.val).toBe('on');
      await wrapper.find('[role="switch"]').trigger('click');
      expect(wrapper.vm.val).toBe('off');
    });
  });

  describe('object pair (generic)', () => {
    it('toggles between two distinct object identities', async () => {
      const ON = { kind: 'on' as const };
      const OFF = { kind: 'off' as const };
      const parent = defineComponent({
        components: { Switch },
        setup() {
          const val = ref<typeof ON | typeof OFF>(OFF);
          return { val, ON, OFF };
        },
        render() {
          return h(Switch, {
            truthy: this.ON,
            falsy: this.OFF,
            modelValue: this.val,
            'onUpdate:modelValue': (v: unknown) => { this.val = v as typeof ON | typeof OFF; },
          });
        },
      });
      const wrapper = mount(parent);
      expect(wrapper.vm.val.kind).toBe('off');
      await wrapper.find('[role="switch"]').trigger('click');
      expect(wrapper.vm.val.kind).toBe('on');
      await wrapper.find('[role="switch"]').trigger('click');
      expect(wrapper.vm.val.kind).toBe('off');
    });
  });

  describe('keyboard activation', () => {
    it('toggles on Space (native button)', async () => {
      const wrapper = mount(Switch);
      await wrapper.trigger('keydown', { key: ' ' });
      // <button> handles Space natively; jsdom dispatches click on Space-keyup, not keydown.
      // We verify our keydown synth does NOT double-toggle on button.
      expect(wrapper.attributes('aria-checked')).toBe('false');
      await wrapper.trigger('click');
      expect(wrapper.attributes('aria-checked')).toBe('true');
    });

    it('toggles on Space when as is not a button', async () => {
      const wrapper = mount(Switch, { props: { as: 'div' } });
      expect(wrapper.attributes('aria-checked')).toBe('false');
      await wrapper.trigger('keydown', { key: ' ' });
      expect(wrapper.attributes('aria-checked')).toBe('true');
      await wrapper.trigger('keydown', { key: ' ' });
      expect(wrapper.attributes('aria-checked')).toBe('false');
    });

    it('toggles on Enter when as is not a button', async () => {
      const wrapper = mount(Switch, { props: { as: 'div' } });
      await wrapper.trigger('keydown', { key: 'Enter' });
      expect(wrapper.attributes('aria-checked')).toBe('true');
    });

    it('does not toggle on other keys', async () => {
      const wrapper = mount(Switch, { props: { as: 'div' } });
      await wrapper.trigger('keydown', { key: 'a' });
      await wrapper.trigger('keydown', { key: 'Tab' });
      expect(wrapper.attributes('aria-checked')).toBe('false');
    });
  });

  describe('non-button host (as="div")', () => {
    it('sets aria-disabled when disabled', () => {
      const wrapper = mount(Switch, { props: { as: 'div', disabled: true } });
      expect(wrapper.attributes('aria-disabled')).toBe('true');
    });

    it('does not set aria-disabled when not disabled', () => {
      const wrapper = mount(Switch, { props: { as: 'div' } });
      expect(wrapper.attributes('aria-disabled')).toBeUndefined();
    });

    it('does not toggle on keyboard when disabled', async () => {
      const wrapper = mount(Switch, { props: { as: 'div', disabled: true } });
      await wrapper.trigger('keydown', { key: ' ' });
      await wrapper.trigger('keydown', { key: 'Enter' });
      expect(wrapper.attributes('aria-checked')).toBe('false');
    });

    it('does not toggle on click when disabled', async () => {
      const wrapper = mount(Switch, { props: { as: 'div', disabled: true } });
      await wrapper.trigger('click');
      expect(wrapper.attributes('aria-checked')).toBe('false');
    });

    it('has tabindex=0 when enabled, -1 when disabled', () => {
      const enabled = mount(Switch, { props: { as: 'div' } });
      expect(enabled.attributes('tabindex')).toBe('0');
      const disabled = mount(Switch, { props: { as: 'div', disabled: true } });
      expect(disabled.attributes('tabindex')).toBe('-1');
    });

    it('button host has no synthesized tabindex (native focusability)', () => {
      const wrapper = mount(Switch);
      expect(wrapper.attributes('tabindex')).toBeUndefined();
    });
  });
});
