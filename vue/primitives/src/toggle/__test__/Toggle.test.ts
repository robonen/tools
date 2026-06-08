import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { Toggle } from '../index';

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
});
