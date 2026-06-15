import {
  HoverCardContent,
  HoverCardRoot,
  HoverCardTrigger,
} from '../../../index';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import type { VueWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils';

const wrappers: Array<VueWrapper<any>> = [];

afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
  document.body.removeAttribute('style');
  vi.useRealTimers();
});

function track<T extends VueWrapper<any>>(w: T): T {
  wrappers.push(w);
  return w;
}

function mountHoverCard(options: {
  open?: boolean;
  defaultOpen?: boolean;
  openDelay?: number;
  closeDelay?: number;
  onUpdateOpen?: (v: boolean | undefined) => void;
  forceMount?: boolean;
} = {}) {
  const Wrapper = defineComponent({
    setup() {
      return () =>
        h(
          HoverCardRoot,
          {
            open: options.open,
            defaultOpen: options.defaultOpen,
            openDelay: options.openDelay,
            closeDelay: options.closeDelay,
            'onUpdate:open': options.onUpdateOpen,
          },
          {
            default: () => [
              h(HoverCardTrigger, null, { default: () => 'Trigger' }),
              h(
                HoverCardContent,
                { forceMount: options.forceMount },
                { default: () => 'Card body' },
              ),
            ],
          },
        );
    },
  });

  return track(mount(Wrapper, { attachTo: document.body }));
}

function getTrigger(): HTMLElement {
  return document.querySelector('[data-hover-card-trigger]') as HTMLElement;
}

describe('HoverCard', () => {
  it('renders trigger with closed state by default', () => {
    mountHoverCard();
    const trigger = getTrigger();
    expect(trigger).toBeTruthy();
    expect(trigger.getAttribute('data-state')).toBe('closed');
    expect(trigger.hasAttribute('data-grace-area-trigger')).toBe(true);
  });

  it('opens with defaultOpen and renders content', async () => {
    mountHoverCard({ defaultOpen: true });
    await nextTick();
    expect(getTrigger().getAttribute('data-state')).toBe('open');
    expect(document.body.textContent).toContain('Card body');
  });

  it('opens after openDelay on pointer enter and closes after closeDelay on leave', async () => {
    vi.useFakeTimers();
    mountHoverCard({ openDelay: 200, closeDelay: 100 });
    const trigger = getTrigger();

    trigger.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    expect(trigger.getAttribute('data-state')).toBe('closed');

    vi.advanceTimersByTime(200);
    await nextTick();
    expect(trigger.getAttribute('data-state')).toBe('open');

    trigger.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    // pointerleave defers close via setTimeout(0) then closeDelay
    vi.advanceTimersByTime(0);
    vi.advanceTimersByTime(100);
    await nextTick();
    expect(trigger.getAttribute('data-state')).toBe('closed');
  });

  it('opens immediately on focus and closes on blur after closeDelay', async () => {
    vi.useFakeTimers();
    mountHoverCard({ openDelay: 500, closeDelay: 50 });
    const trigger = getTrigger();

    trigger.dispatchEvent(new FocusEvent('focus'));
    // openDelay still applies for focus too (matches reka behavior)
    vi.advanceTimersByTime(500);
    await nextTick();
    expect(trigger.getAttribute('data-state')).toBe('open');

    trigger.dispatchEvent(new FocusEvent('blur'));
    vi.advanceTimersByTime(50);
    await nextTick();
    expect(trigger.getAttribute('data-state')).toBe('closed');
  });

  it('ignores touch pointer events', async () => {
    vi.useFakeTimers();
    mountHoverCard({ openDelay: 50 });
    const trigger = getTrigger();
    trigger.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' }));
    vi.advanceTimersByTime(50);
    await nextTick();
    expect(trigger.getAttribute('data-state')).toBe('closed');
  });

  it('closes on Escape via dismissable layer', async () => {
    mountHoverCard({ defaultOpen: true });
    await nextTick();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await nextTick();
    expect(getTrigger().getAttribute('data-state')).toBe('closed');
  });

  it('supports controlled v-model', async () => {
    const onUpdate = vi.fn();
    const Wrapper = defineComponent({
      props: { open: { type: Boolean, default: false } },
      emits: ['update:open'],
      setup(props, { emit }) {
        return () =>
          h(
            HoverCardRoot,
            {
              open: props.open,
              openDelay: 0,
              closeDelay: 0,
              'onUpdate:open': (v: boolean | undefined) => {
                onUpdate(v);
                emit('update:open', v);
              },
            },
            {
              default: () => [
                h(HoverCardTrigger, null, { default: () => 'T' }),
                h(HoverCardContent, null, { default: () => 'B' }),
              ],
            },
          );
      },
    });
    const wrapper = track(mount(Wrapper, { attachTo: document.body, props: { open: false } }));
    const trigger = getTrigger();

    trigger.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    await nextTick();
    expect(onUpdate).toHaveBeenCalledWith(true);
    expect(trigger.getAttribute('data-state')).toBe('closed');

    await wrapper.setProps({ open: true });
    await nextTick();
    expect(trigger.getAttribute('data-state')).toBe('open');
  });

  it('removes focusable content descendants from the tab sequence', async () => {
    const Wrapper = defineComponent({
      setup() {
        return () =>
          h(HoverCardRoot, { defaultOpen: true }, {
            default: () => [
              h(HoverCardTrigger, null, { default: () => 'Trigger' }),
              h(HoverCardContent, null, {
                default: () => [
                  h('a', { href: '#one', 'data-link': 'one' }, 'Link one'),
                  h('button', { 'data-btn': 'two' }, 'Button two'),
                ],
              }),
            ],
          });
      },
    });
    track(mount(Wrapper, { attachTo: document.body }));
    await nextTick();

    const link = document.querySelector('[data-link="one"]') as HTMLElement;
    const button = document.querySelector('[data-btn="two"]') as HTMLElement;
    expect(link).toBeTruthy();
    expect(button).toBeTruthy();
    expect(link.getAttribute('tabindex')).toBe('-1');
    expect(button.getAttribute('tabindex')).toBe('-1');
  });

  it('exposes the content element via a forwarded ref', async () => {
    const contentRef = vi.fn();
    const Wrapper = defineComponent({
      setup() {
        return () =>
          h(HoverCardRoot, { defaultOpen: true }, {
            default: () => [
              h(HoverCardTrigger, null, { default: () => 'Trigger' }),
              h(HoverCardContent, { ref: contentRef }, { default: () => 'Body' }),
            ],
          });
      },
    });
    track(mount(Wrapper, { attachTo: document.body }));
    await nextTick();
    expect(contentRef).toHaveBeenCalled();
    const instance = contentRef.mock.calls.at(-1)?.[0];
    expect(instance).toBeTruthy();
  });

  it('forwards extended positioning props to the content without error', async () => {
    const Wrapper = defineComponent({
      setup() {
        return () =>
          h(HoverCardRoot, { defaultOpen: true }, {
            default: () => [
              h(HoverCardTrigger, null, { default: () => 'Trigger' }),
              h(
                HoverCardContent,
                {
                  prioritizePosition: true,
                  disableUpdateOnLayoutShift: true,
                  hideShiftedArrow: false,
                  'data-marker': 'content',
                },
                { default: () => 'Body' },
              ),
            ],
          });
      },
    });
    track(mount(Wrapper, { attachTo: document.body }));
    await nextTick();
    const content = document.querySelector('[data-marker="content"]') as HTMLElement;
    expect(content).toBeTruthy();
    expect(content.getAttribute('data-state')).toBe('open');
  });
});
