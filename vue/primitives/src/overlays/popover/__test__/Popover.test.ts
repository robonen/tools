import {
  PopoverAnchor,
  PopoverArrow,
  PopoverClose,
  PopoverContent,
  PopoverPortal,
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

describe('Popover content ref forwarding', () => {
  it('exposes the content element via a template ref (non-modal)', async () => {
    const contentRef = ref<{ $el: HTMLElement } | null>(null);
    const Wrapper = defineComponent({
      setup() {
        return () => h(
          PopoverRoot,
          { defaultOpen: true },
          {
            default: () => [
              h(PopoverTrigger, null, { default: () => 'Toggle' }),
              h(PopoverContent, { ref: contentRef, forceMount: true }, { default: () => 'Body' }),
            ],
          },
        );
      },
    });

    const wrapper = track(mount(Wrapper, { attachTo: document.body }));
    await nextTick();

    const dialog = wrapper.find('[role="dialog"]').element;
    expect(contentRef.value?.$el).toBe(dialog);
  });

  it('exposes the content element via a template ref (modal)', async () => {
    const contentRef = ref<{ $el: HTMLElement } | null>(null);
    const Wrapper = defineComponent({
      setup() {
        return () => h(
          PopoverRoot,
          { defaultOpen: true, modal: true },
          {
            default: () => [
              h(PopoverTrigger, null, { default: () => 'Toggle' }),
              h(PopoverContent, { ref: contentRef, forceMount: true }, { default: () => 'Body' }),
            ],
          },
        );
      },
    });

    const wrapper = track(mount(Wrapper, { attachTo: document.body }));
    await nextTick();

    const dialog = wrapper.find('[role="dialog"]').element;
    expect(contentRef.value?.$el).toBe(dialog);
  });
});

describe('Popover focus guards', () => {
  it('inserts edge focus guards while content is open', async () => {
    expect(document.querySelectorAll('[data-focus-guard]').length).toBe(0);

    const wrapper = mountPopover({ defaultOpen: true });
    await nextTick();

    expect(document.querySelectorAll('[data-focus-guard]').length).toBe(2);

    wrapper.unmount();
    await nextTick();

    expect(document.querySelectorAll('[data-focus-guard]').length).toBe(0);
  });
});

describe('Popover modal hides background content', () => {
  it('aria-hides sibling trees when modal content is open', async () => {
    const sibling = document.createElement('div');
    sibling.id = 'outside-sibling';
    sibling.textContent = 'background';
    document.body.appendChild(sibling);

    const Wrapper = defineComponent({
      setup() {
        return () => h(
          PopoverRoot,
          { defaultOpen: true, modal: true },
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
    await nextTick();

    expect(sibling.getAttribute('aria-hidden')).toBe('true');

    wrapper.unmount();
    await nextTick();

    expect(sibling.getAttribute('aria-hidden')).not.toBe('true');
    sibling.remove();
  });

  it('does NOT aria-hide siblings in non-modal mode', async () => {
    const sibling = document.createElement('div');
    sibling.id = 'outside-sibling-nonmodal';
    document.body.appendChild(sibling);

    const Wrapper = defineComponent({
      setup() {
        return () => h(
          PopoverRoot,
          { defaultOpen: true, modal: false },
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
    await nextTick();

    expect(sibling.getAttribute('aria-hidden')).not.toBe('true');

    wrapper.unmount();
    sibling.remove();
  });
});

describe('PopoverAnchor', () => {
  it('exposes its element via a template ref', async () => {
    const anchorRef = ref<{ $el: HTMLElement } | null>(null);
    const Wrapper = defineComponent({
      setup() {
        return () => h(
          PopoverRoot,
          null,
          {
            default: () => [
              h(PopoverAnchor, { ref: anchorRef }, { default: () => h('span', 'anchor') }),
              h(PopoverTrigger, null, { default: () => 'Toggle' }),
            ],
          },
        );
      },
    });

    track(mount(Wrapper, { attachTo: document.body }));
    await nextTick();

    expect(anchorRef.value?.$el).toBeInstanceOf(HTMLElement);
    expect(anchorRef.value?.$el.textContent).toBe('anchor');
  });
});

describe('PopoverArrow', () => {
  function mountArrow(arrowProps: Record<string, unknown> = {}) {
    const Wrapper = defineComponent({
      setup() {
        return () => h(
          PopoverRoot,
          { defaultOpen: true },
          {
            default: () => [
              h(PopoverTrigger, null, { default: () => 'Toggle' }),
              h(PopoverContent, { forceMount: true }, {
                default: () => h(PopoverArrow, arrowProps),
              }),
            ],
          },
        );
      },
    });

    return track(mount(Wrapper, { attachTo: document.body }));
  }

  it('renders a default svg triangle out of the box', async () => {
    const wrapper = mountArrow();
    await nextTick();

    const svg = wrapper.find('[role="dialog"] svg');
    expect(svg.exists()).toBe(true);
    expect(svg.find('path').exists()).toBe(true);
    expect(svg.find('path').attributes('d')).toBe('M0 0L6 6L12 0');
  });

  it('forwards the rounded prop to the underlying arrow path', async () => {
    const wrapper = mountArrow({ rounded: true });
    await nextTick();

    const path = wrapper.find('[role="dialog"] svg path');
    expect(path.exists()).toBe(true);
    expect(path.attributes('d')).not.toBe('M0 0L6 6L12 0');
  });

  it('forwards width/height attributes', async () => {
    const wrapper = mountArrow({ width: 20, height: 8 });
    await nextTick();

    const svg = wrapper.find('[role="dialog"] svg');
    expect(svg.attributes('width')).toBe('20');
    expect(svg.attributes('height')).toBe('8');
  });

  it('exposes the arrow element via a template ref', async () => {
    const arrowRef = ref<{ $el: HTMLElement } | null>(null);
    const Wrapper = defineComponent({
      setup() {
        return () => h(
          PopoverRoot,
          { defaultOpen: true },
          {
            default: () => [
              h(PopoverTrigger, null, { default: () => 'Toggle' }),
              h(PopoverContent, { forceMount: true }, {
                default: () => h(PopoverArrow, { ref: arrowRef }),
              }),
            ],
          },
        );
      },
    });

    track(mount(Wrapper, { attachTo: document.body }));
    await nextTick();

    expect(arrowRef.value?.$el).toBeTruthy();
  });
});

describe('PopoverPortal', () => {
  it('teleports content out into a custom container', async () => {
    const target = document.createElement('div');
    target.id = 'portal-target';
    document.body.appendChild(target);

    const Wrapper = defineComponent({
      setup() {
        return () => h(
          PopoverRoot,
          { defaultOpen: true },
          {
            default: () => [
              h(PopoverTrigger, null, { default: () => 'Toggle' }),
              h(PopoverPortal, { to: '#portal-target' }, {
                default: () => h(PopoverContent, { forceMount: true }, { default: () => 'Body' }),
              }),
            ],
          },
        );
      },
    });

    const wrapper = track(mount(Wrapper, { attachTo: document.body }));
    await nextTick();

    expect(target.querySelector('[role="dialog"]')).not.toBeNull();

    wrapper.unmount();
    target.remove();
  });
});
