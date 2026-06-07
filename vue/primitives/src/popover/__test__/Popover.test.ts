import {
  PopoverClose,
  PopoverContent,
  PopoverRoot,
  PopoverTrigger,
} from '../index';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import type { VueWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils';
import { userEvent } from 'vitest/browser';

const wrappers: Array<VueWrapper<any>> = [];

afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
  document.body.removeAttribute('style');
});

function track<T extends VueWrapper<any>>(w: T): T {
  wrappers.push(w);
  return w;
}

function mountPopover(options: {
  open?: boolean;
  defaultOpen?: boolean;
  modal?: boolean;
  onUpdateOpen?: (v: boolean) => void;
} = {}) {
  const Wrapper = defineComponent({
    setup() {
      return () => h(
        PopoverRoot,
        {
          open: options.open,
          defaultOpen: options.defaultOpen,
          modal: options.modal,
          'onUpdate:open': options.onUpdateOpen,
        },
        {
          default: () => [
            h(PopoverTrigger, null, { default: () => 'Toggle' }),
            h(PopoverContent, { forceMount: true }, {
              default: () => [
                h('p', 'Popover body'),
                h(PopoverClose, null, { default: () => 'Close' }),
              ],
            }),
          ],
        },
      );
    },
  });

  return track(mount(Wrapper, { attachTo: document.body }));
}

describe('Popover', () => {
  it('renders trigger', () => {
    const wrapper = mountPopover();
    const trigger = wrapper.find('button');
    expect(trigger.text()).toBe('Toggle');
    expect(trigger.attributes('aria-haspopup')).toBe('dialog');
    expect(trigger.attributes('data-state')).toBe('closed');
  });

  it('opens on trigger click', async () => {
    const wrapper = mountPopover();
    const trigger = wrapper.find('button');

    await trigger.trigger('click');
    await nextTick();

    expect(trigger.attributes('aria-expanded')).toBe('true');
    expect(trigger.attributes('data-state')).toBe('open');
  });

  it('toggles with v-model:open', async () => {
    const onUpdate = vi.fn();
    const wrapper = mountPopover({ onUpdateOpen: onUpdate });
    const trigger = wrapper.find('button');

    await trigger.trigger('click');
    await nextTick();

    expect(onUpdate).toHaveBeenCalledWith(true);
  });

  it('opens with defaultOpen', async () => {
    const wrapper = mountPopover({ defaultOpen: true });
    await nextTick();

    const trigger = wrapper.find('button');
    expect(trigger.attributes('data-state')).toBe('open');
  });

  it('close button closes the popover', async () => {
    const onUpdate = vi.fn();
    const wrapper = mountPopover({ defaultOpen: true, onUpdateOpen: onUpdate });
    await nextTick();

    const closeBtn = wrapper.findAll('button').find(b => b.text() === 'Close');
    expect(closeBtn).toBeDefined();

    await closeBtn!.trigger('click');
    await nextTick();

    expect(onUpdate).toHaveBeenCalledWith(false);
  });

  it('content has role="dialog"', async () => {
    const wrapper = mountPopover({ defaultOpen: true });
    await nextTick();

    const content = wrapper.find('[role="dialog"]');
    expect(content.exists()).toBe(true);
    expect(content.attributes('data-state')).toBe('open');
  });

  it('closes on Escape key', async () => {
    const onUpdate = vi.fn();
    mountPopover({ defaultOpen: true, onUpdateOpen: onUpdate });
    await nextTick();

    await userEvent.keyboard('{Escape}');
    await nextTick();

    expect(onUpdate).toHaveBeenCalledWith(false);
  });

  it('supports controlled open', async () => {
    const Wrapper = defineComponent({
      setup() {
        const open = ref(false);
        return () => h(
          PopoverRoot,
          { open: open.value, 'onUpdate:open': (v: boolean) => { open.value = v; } },
          {
            default: () => [
              h(PopoverTrigger, null, { default: () => 'Toggle' }),
              h(PopoverContent, { forceMount: true }, { default: () => 'Body' }),
            ],
          },
        );
      },
    });

    const wrapper = track(mount(Wrapper, { attachTo: document.body }));
    await nextTick();

    expect(wrapper.find('button').attributes('data-state')).toBe('closed');

    await wrapper.find('button').trigger('click');
    await nextTick();

    expect(wrapper.find('button').attributes('data-state')).toBe('open');
  });

  it('trigger has aria-controls pointing to content id', async () => {
    const wrapper = mountPopover({ defaultOpen: true });
    await nextTick();

    const trigger = wrapper.find('button');
    const contentId = wrapper.find('[role="dialog"]').attributes('id');
    expect(trigger.attributes('aria-controls')).toBe(contentId);
  });
});
