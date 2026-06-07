import {
  TooltipContent,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from '../../index';
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

function mountTooltip(options: {
  open?: boolean;
  defaultOpen?: boolean;
  delayDuration?: number;
  skipDelayDuration?: number;
  disabled?: boolean;
  disableHoverableContent?: boolean;
  disableClosingTrigger?: boolean;
  ignoreNonKeyboardFocus?: boolean;
  onUpdateOpen?: (v: boolean) => void;
  forceMount?: boolean;
} = {}) {
  const Wrapper = defineComponent({
    setup() {
      return () =>
        h(
          TooltipProvider,
          {
            delayDuration: options.delayDuration,
            skipDelayDuration: options.skipDelayDuration,
          },
          {
            default: () =>
              h(
                TooltipRoot,
                {
                  open: options.open,
                  defaultOpen: options.defaultOpen,
                  disabled: options.disabled,
                  disableHoverableContent: options.disableHoverableContent,
                  disableClosingTrigger: options.disableClosingTrigger,
                  ignoreNonKeyboardFocus: options.ignoreNonKeyboardFocus,
                  'onUpdate:open': options.onUpdateOpen,
                },
                {
                  default: () => [
                    h(TooltipTrigger, null, { default: () => 'Trigger' }),
                    h(
                      TooltipContent,
                      { forceMount: options.forceMount },
                      { default: () => 'Tooltip body' },
                    ),
                  ],
                },
              ),
          },
        );
    },
  });

  return track(mount(Wrapper, { attachTo: document.body }));
}

function getTrigger(): HTMLButtonElement {
  return document.querySelector('[data-tooltip-trigger]') as HTMLButtonElement;
}

function getTooltip(): HTMLElement | null {
  return document.querySelector('[role="tooltip"]');
}

describe('Tooltip', () => {
  it('renders trigger with closed state by default', () => {
    mountTooltip();
    const trigger = getTrigger();
    expect(trigger).toBeTruthy();
    expect(trigger.getAttribute('data-state')).toBe('closed');
    expect(trigger.getAttribute('aria-describedby')).toBe(null);
    expect(getTooltip()).toBeNull();
  });

  it('opens with defaultOpen and exposes aria-describedby', async () => {
    mountTooltip({ defaultOpen: true });
    await nextTick();

    const trigger = getTrigger();
    expect(trigger.getAttribute('data-state')).toBe('instant-open');
    expect(trigger.getAttribute('aria-describedby')).toBeTruthy();

    const tip = getTooltip();
    expect(tip).toBeTruthy();
    expect(tip!.id).toBe(trigger.getAttribute('aria-describedby'));
  });

  it('opens on focus and closes on blur', async () => {
    mountTooltip();
    const trigger = getTrigger();

    trigger.dispatchEvent(new FocusEvent('focus'));
    await nextTick();
    expect(trigger.getAttribute('data-state')).toBe('instant-open');

    trigger.dispatchEvent(new FocusEvent('blur'));
    await nextTick();
    expect(trigger.getAttribute('data-state')).toBe('closed');
  });

  it('respects controlled v-model', async () => {
    const onUpdate = vi.fn();
    const Wrapper = defineComponent({
      props: { open: { type: Boolean, default: false } },
      emits: ['update:open'],
      setup(props, { emit }) {
        return () =>
          h(
            TooltipProvider,
            null,
            {
              default: () =>
                h(
                  TooltipRoot,
                  {
                    open: props.open,
                    'onUpdate:open': (v: boolean) => {
                      onUpdate(v);
                      emit('update:open', v);
                    },
                  },
                  {
                    default: () => [
                      h(TooltipTrigger, null, { default: () => 'T' }),
                      h(TooltipContent, null, { default: () => 'body' }),
                    ],
                  },
                ),
            },
          );
      },
    });
    const wrapper = track(mount(Wrapper, { attachTo: document.body, props: { open: false } }));
    const trigger = getTrigger();

    trigger.dispatchEvent(new FocusEvent('focus'));
    await nextTick();
    expect(onUpdate).toHaveBeenCalledWith(true);
    expect(trigger.getAttribute('data-state')).toBe('closed');

    await wrapper.setProps({ open: true });
    await nextTick();
    expect(trigger.getAttribute('data-state')).toBe('instant-open');
  });

  it('does not open when disabled', async () => {
    mountTooltip({ disabled: true });
    const trigger = getTrigger();

    trigger.dispatchEvent(new FocusEvent('focus'));
    await nextTick();
    expect(trigger.getAttribute('data-state')).toBe('closed');
    expect(getTooltip()).toBeNull();
  });

  it('uses delayed-open after delay window via pointer', async () => {
    vi.useFakeTimers();
    mountTooltip({ delayDuration: 100, skipDelayDuration: 50 });
    const trigger = getTrigger();

    trigger.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse' }));
    // Not opened yet.
    expect(trigger.getAttribute('data-state')).toBe('closed');

    vi.advanceTimersByTime(100);
    await nextTick();
    expect(trigger.getAttribute('data-state')).toBe('delayed-open');
  });

  it('skips delay for second tooltip within skipDelayDuration window', async () => {
    vi.useFakeTimers();

    const Wrapper = defineComponent({
      setup() {
        return () =>
          h(
            TooltipProvider,
            { delayDuration: 500, skipDelayDuration: 300 },
            {
              default: () => [
                h(
                  TooltipRoot,
                  null,
                  {
                    default: () => [
                      h(TooltipTrigger, { 'data-id': 'a' }, { default: () => 'A' }),
                      h(TooltipContent, null, { default: () => 'A body' }),
                    ],
                  },
                ),
                h(
                  TooltipRoot,
                  null,
                  {
                    default: () => [
                      h(TooltipTrigger, { 'data-id': 'b' }, { default: () => 'B' }),
                      h(TooltipContent, null, { default: () => 'B body' }),
                    ],
                  },
                ),
              ],
            },
          );
      },
    });

    track(mount(Wrapper, { attachTo: document.body }));

    const a = document.querySelector('[data-id="a"]') as HTMLElement;
    const b = document.querySelector('[data-id="b"]') as HTMLElement;

    // Open A with delay.
    a.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse' }));
    vi.advanceTimersByTime(500);
    await nextTick();
    expect(a.getAttribute('data-state')).toBe('delayed-open');

    // Close A via blur-equivalent: pointerleave + disableHoverable would do it,
    // but here we just close via focus loss simulation through trigger event.
    a.dispatchEvent(new FocusEvent('blur'));
    await nextTick();
    expect(a.getAttribute('data-state')).toBe('closed');

    // Within the skip window — moving over B should open it instantly.
    vi.advanceTimersByTime(100);
    b.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse' }));
    await nextTick();
    expect(b.getAttribute('data-state')).toBe('instant-open');
  });

  it('does not open on touch pointers (handled by long-press elsewhere)', async () => {
    mountTooltip({ delayDuration: 0 });
    const trigger = getTrigger();

    trigger.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'touch' }));
    await nextTick();
    expect(trigger.getAttribute('data-state')).toBe('closed');
  });

  it('closes on Escape via dismissable layer', async () => {
    mountTooltip({ defaultOpen: true });
    await nextTick();
    expect(getTrigger().getAttribute('data-state')).toBe('instant-open');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await nextTick();
    expect(getTrigger().getAttribute('data-state')).toBe('closed');
  });

  it('closes when clicked unless disableClosingTrigger', async () => {
    mountTooltip({ defaultOpen: true });
    await nextTick();
    const trigger = getTrigger();

    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    expect(trigger.getAttribute('data-state')).toBe('closed');
  });

  it('keeps tooltip open on click when disableClosingTrigger is set', async () => {
    mountTooltip({ defaultOpen: true, disableClosingTrigger: true });
    await nextTick();
    const trigger = getTrigger();

    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    expect(trigger.getAttribute('data-state')).toBe('instant-open');
  });
});
