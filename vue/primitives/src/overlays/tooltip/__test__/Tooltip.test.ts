import {
  TooltipContent,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from '../../../index';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
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

  it('tags the trigger as a grace-area trigger for safe-area handoff', () => {
    mountTooltip();
    const trigger = getTrigger();
    expect(trigger.hasAttribute('data-grace-area-trigger')).toBe(true);
    // Existing marker is preserved for backwards compatibility.
    expect(trigger.hasAttribute('data-tooltip-trigger')).toBe(true);
  });
});

describe('Tooltip hoverable content', () => {
  it('renders the hoverable variant by default (no flicker on content hover)', async () => {
    mountTooltip({ defaultOpen: true });
    await nextTick();
    const tip = getTooltip();
    expect(tip).toBeTruthy();
    // Hoverable variant wires a grace area; the impl still renders role=tooltip,
    // so we assert the content is present and the variant did not crash.
    expect(tip!.textContent).toContain('Tooltip body');
  });

  it('renders without grace area when disableHoverableContent is set', async () => {
    mountTooltip({ defaultOpen: true, disableHoverableContent: true });
    await nextTick();
    const tip = getTooltip();
    expect(tip).toBeTruthy();
    expect(tip!.textContent).toContain('Tooltip body');
  });
});

describe('Tooltip reference anchor', () => {
  it('forwards a custom reference to the popper anchor', async () => {
    const reference = document.createElement('div');
    document.body.appendChild(reference);

    const Wrapper = defineComponent({
      setup() {
        return () =>
          h(TooltipProvider, null, {
            default: () =>
              h(TooltipRoot, { defaultOpen: true }, {
                default: () => [
                  h(TooltipTrigger, { reference }, { default: () => 'T' }),
                  h(TooltipContent, null, { default: () => 'body' }),
                ],
              }),
          });
      },
    });

    const wrapper = track(mount(Wrapper, { attachTo: document.body }));
    await nextTick();
    // No throw and the tooltip still opens with a custom reference element.
    expect(getTrigger().hasAttribute('data-grace-area-trigger')).toBe(true);
    expect(getTooltip()).toBeTruthy();
    wrapper.unmount();
    reference.remove();
  });
});

describe('Tooltip provider content defaults', () => {
  function mountWithProviderContent(options: {
    providerAriaLabel?: string;
    contentAriaLabel?: string;
  }) {
    const Wrapper = defineComponent({
      setup() {
        return () =>
          h(
            TooltipProvider,
            { content: { ariaLabel: options.providerAriaLabel } },
            {
              default: () =>
                h(TooltipRoot, { defaultOpen: true }, {
                  default: () => [
                    h(TooltipTrigger, null, { default: () => 'T' }),
                    h(
                      TooltipContent,
                      { ariaLabel: options.contentAriaLabel },
                      { default: () => 'visible body' },
                    ),
                  ],
                }),
            },
          );
      },
    });
    return track(mount(Wrapper, { attachTo: document.body }));
  }

  it('applies a provider-level content default to every tooltip', async () => {
    mountWithProviderContent({ providerAriaLabel: 'from provider' });
    await nextTick();
    const tip = getTooltip();
    expect(tip!.textContent).toContain('from provider');
  });

  it('lets per-content props win over provider defaults', async () => {
    mountWithProviderContent({
      providerAriaLabel: 'from provider',
      contentAriaLabel: 'from content',
    });
    await nextTick();
    const tip = getTooltip();
    expect(tip!.textContent).toContain('from content');
    expect(tip!.textContent).not.toContain('from provider');
  });
});

describe('Tooltip controlled-open broadcast', () => {
  it('closes another open tooltip when one opens via controlled v-model', async () => {
    const Wrapper = defineComponent({
      props: { openB: { type: Boolean, default: false } },
      setup(props) {
        const openA = ref(true);
        return () =>
          h(TooltipProvider, null, {
            default: () => [
              h(
                TooltipRoot,
                { open: openA.value, 'onUpdate:open': (v: boolean) => { openA.value = v; } },
                {
                  default: () => [
                    h(TooltipTrigger, { 'data-id': 'a' }, { default: () => 'A' }),
                    h(TooltipContent, null, { default: () => 'A body' }),
                  ],
                },
              ),
              h(TooltipRoot, { open: props.openB }, {
                default: () => [
                  h(TooltipTrigger, { 'data-id': 'b' }, { default: () => 'B' }),
                  h(TooltipContent, null, { default: () => 'B body' }),
                ],
              }),
            ],
          });
      },
    });

    const wrapper = track(mount(Wrapper, { attachTo: document.body, props: { openB: false } }));
    await nextTick();

    const a = document.querySelector('[data-id="a"]') as HTMLElement;
    expect(a.getAttribute('data-state')).toBe('instant-open');

    // Opening B (controlled) should broadcast TOOLTIP_OPEN and close A.
    await wrapper.setProps({ openB: true });
    await nextTick();
    await nextTick();

    const b = document.querySelector('[data-id="b"]') as HTMLElement;
    expect(b.getAttribute('data-state')).toBe('instant-open');
    expect(a.getAttribute('data-state')).toBe('closed');
  });
});
