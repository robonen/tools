import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from '../index';

function mountCollapsible(props: Record<string, unknown> = {}) {
  return mount(defineComponent({
    setup: () => () => h(CollapsibleRoot, props, {
      default: () => [
        h(CollapsibleTrigger, { class: 'trig' }, { default: () => 'Toggle' }),
        h(CollapsibleContent, { class: 'c' }, { default: () => 'Body' }),
      ],
    }),
  }));
}

describe('Collapsible', () => {
  it('starts closed by default; trigger toggles state', async () => {
    const w = mountCollapsible();
    const trigger = w.find('.trig');
    expect(trigger.attributes('aria-expanded')).toBe('false');
    expect(w.find('.c').exists()).toBe(false);
    await trigger.trigger('click');
    expect(trigger.attributes('aria-expanded')).toBe('true');
    expect(w.find('.c').exists()).toBe(true);
  });

  it('opens via defaultOpen', async () => {
    const w = mountCollapsible({ defaultOpen: true });
    await nextTick();
    expect(w.find('.trig').attributes('aria-expanded')).toBe('true');
    expect(w.find('.c').exists()).toBe(true);
    expect(w.find('.c').text()).toBe('Body');
  });

  it('wires aria-controls to content id', async () => {
    const w = mountCollapsible({ defaultOpen: true });
    await nextTick();
    const id = w.find('.c').attributes('id');
    expect(id).toMatch(/collapsible-content/);
    expect(w.find('.trig').attributes('aria-controls')).toBe(id);
  });

  it('respects disabled', async () => {
    const w = mountCollapsible({ disabled: true });
    await w.find('.trig').trigger('click');
    expect(w.find('.trig').attributes('aria-expanded')).toBe('false');
    expect(w.find('.trig').attributes('data-disabled')).toBe('');
  });

  it('forceMount keeps content in DOM when closed', () => {
    const w = mount(defineComponent({
      setup: () => () => h(CollapsibleRoot, null, {
        default: () => [
          h(CollapsibleTrigger, { class: 'trig' }),
          h(CollapsibleContent, { class: 'c', forceMount: true }, { default: () => 'Body' }),
        ],
      }),
    }));
    const content = w.find('.c');
    expect(content.exists()).toBe(true);
    expect(content.attributes('hidden')).toBeDefined();
    expect(content.attributes('data-state')).toBe('closed');
  });
});
