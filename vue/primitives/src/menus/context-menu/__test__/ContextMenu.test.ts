import type { VueWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';

import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuPortal,
  ContextMenuRoot,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '../../../index';

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

function mountContextMenu(options: {
  triggerAttrs?: Record<string, unknown>;
  rootProps?: Record<string, unknown>;
  onUpdateOpen?: (v: boolean) => void;
} = {}) {
  const Harness = defineComponent({
    setup() {
      return () =>
        h(
          ContextMenuRoot,
          { ...options.rootProps, 'onUpdate:open': options.onUpdateOpen },
          {
            default: () => [
              h(
                ContextMenuTrigger,
                { 'data-testid': 'trigger', ...options.triggerAttrs },
                { default: () => 'Right-click me' },
              ),
              h(ContextMenuPortal, null, {
                default: () =>
                  h(ContextMenuContent, null, {
                    default: () => h(ContextMenuItem, null, { default: () => 'Item' }),
                  }),
              }),
            ],
          },
        );
    },
  });
  return track(mount(Harness, { attachTo: document.body }));
}

function getTrigger(): HTMLElement {
  return document.querySelector('[data-testid="trigger"]') as HTMLElement;
}

function dispatchContextMenu(el: HTMLElement, x = 100, y = 80) {
  el.dispatchEvent(new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
  }));
}

describe('context-menu — trigger element', () => {
  it('merges fallthrough attrs onto the element carrying data-state (no anchor wrapper div)', () => {
    mountContextMenu({ triggerAttrs: { id: 'trigger-el', class: 'canvas-area' } });
    const trigger = getTrigger();
    expect(trigger).toBeTruthy();
    expect(trigger.id).toBe('trigger-el');
    expect(trigger.classList.contains('canvas-area')).toBe(true);
    expect(trigger.getAttribute('data-state')).toBe('closed');
    // No intermediate anchor element between the harness root and the trigger.
    expect(trigger.parentElement).toBe(wrappers[0]!.element);
  });

  it('opens the menu when contextmenu is dispatched on the attr-bearing element', async () => {
    const onUpdateOpen = vi.fn();
    mountContextMenu({ triggerAttrs: { class: 'canvas-area' }, onUpdateOpen });
    const trigger = getTrigger();

    dispatchContextMenu(trigger);
    await nextTick();
    await nextTick();

    expect(onUpdateOpen).toHaveBeenCalledWith(true);
    expect(trigger.getAttribute('data-state')).toBe('open');
    expect(document.querySelector('[role="menu"]')).toBeTruthy();
  });
});

describe('context-menu — long-press', () => {
  function pointerDown(el: HTMLElement, pointerType: string, x = 50, y = 60) {
    el.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      button: 0,
      pointerType,
      clientX: x,
      clientY: y,
    }));
  }

  it('opens after a 700ms touch long-press', async () => {
    vi.useFakeTimers();
    mountContextMenu();
    const trigger = getTrigger();

    pointerDown(trigger, 'touch');
    expect(trigger.getAttribute('data-state')).toBe('closed');

    vi.advanceTimersByTime(700);
    await nextTick();
    expect(trigger.getAttribute('data-state')).toBe('open');
  });

  it('opens after a pen long-press', async () => {
    vi.useFakeTimers();
    mountContextMenu();
    const trigger = getTrigger();

    pointerDown(trigger, 'pen');
    vi.advanceTimersByTime(700);
    await nextTick();
    expect(trigger.getAttribute('data-state')).toBe('open');
  });

  it('cancels the long-press when the pointer moves (drag/scroll gesture)', async () => {
    vi.useFakeTimers();
    mountContextMenu();
    const trigger = getTrigger();

    pointerDown(trigger, 'touch');
    vi.advanceTimersByTime(300);
    trigger.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true,
      pointerType: 'touch',
      clientX: 50,
      clientY: 120,
    }));
    vi.advanceTimersByTime(700);
    await nextTick();
    expect(trigger.getAttribute('data-state')).toBe('closed');
  });

  it('cancels the long-press on pointerup', async () => {
    vi.useFakeTimers();
    mountContextMenu();
    const trigger = getTrigger();

    pointerDown(trigger, 'touch');
    vi.advanceTimersByTime(300);
    trigger.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch' }));
    vi.advanceTimersByTime(700);
    await nextTick();
    expect(trigger.getAttribute('data-state')).toBe('closed');
  });

  it('does not start a long-press for mouse pointers', async () => {
    vi.useFakeTimers();
    mountContextMenu();
    const trigger = getTrigger();

    pointerDown(trigger, 'mouse');
    vi.advanceTimersByTime(700);
    await nextTick();
    expect(trigger.getAttribute('data-state')).toBe('closed');
  });

  it('honours a custom pressOpenDelay on the root', async () => {
    vi.useFakeTimers();
    mountContextMenu({ rootProps: { pressOpenDelay: 300 } });
    const trigger = getTrigger();

    pointerDown(trigger, 'touch');
    vi.advanceTimersByTime(299);
    await nextTick();
    expect(trigger.getAttribute('data-state')).toBe('closed');

    vi.advanceTimersByTime(1);
    await nextTick();
    expect(trigger.getAttribute('data-state')).toBe('open');
  });
});

describe('context-menu — contextmenu open semantics', () => {
  it('does not open when the contextmenu event was already defaultPrevented (nested / consumer suppression)', async () => {
    const onUpdateOpen = vi.fn();
    mountContextMenu({ onUpdateOpen });
    const trigger = getTrigger();

    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 });
    event.preventDefault();
    trigger.dispatchEvent(event);
    await nextTick();
    await nextTick();

    expect(onUpdateOpen).not.toHaveBeenCalled();
    expect(trigger.getAttribute('data-state')).toBe('closed');
  });

  it('does not open when the trigger is disabled', async () => {
    const onUpdateOpen = vi.fn();
    mountContextMenu({ triggerAttrs: { disabled: true }, onUpdateOpen });
    const trigger = getTrigger();

    dispatchContextMenu(trigger);
    await nextTick();
    await nextTick();

    expect(onUpdateOpen).not.toHaveBeenCalled();
    expect(trigger.getAttribute('data-state')).toBe('closed');
    expect(trigger.getAttribute('data-disabled')).toBe('');
  });
});

describe('context-menu — trigger defensive styles', () => {
  it('applies pointerEvents:auto so the trigger always receives the secondary click', () => {
    mountContextMenu();
    const trigger = getTrigger();
    expect(trigger.style.pointerEvents).toBe('auto');
  });
});

describe('context-menu — right-click-on-trigger guard', () => {
  it('does not dismiss the open menu when the trigger is right-clicked again', async () => {
    const onUpdateOpen = vi.fn();
    mountContextMenu({ onUpdateOpen });
    const trigger = getTrigger();

    dispatchContextMenu(trigger);
    await nextTick();
    await nextTick();
    expect(trigger.getAttribute('data-state')).toBe('open');

    onUpdateOpen.mockClear();
    // A right-click (button=2) pointerdown lands "outside" the content but on
    // the trigger; the guard must preventDefault so the layer does not dismiss.
    trigger.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      button: 2,
      clientX: 100,
      clientY: 80,
    }));
    await nextTick();
    await nextTick();

    expect(onUpdateOpen).not.toHaveBeenCalledWith(false);
    expect(trigger.getAttribute('data-state')).toBe('open');
  });
});

describe('context-menu — content positioning', () => {
  it('anchors the content to the cursor side/align and exposes trigger-size CSS vars', async () => {
    mountContextMenu();
    const trigger = getTrigger();

    dispatchContextMenu(trigger);
    await nextTick();
    await nextTick();

    const content = document.querySelector('[role="menu"]') as HTMLElement;
    expect(content).toBeTruthy();
    expect(content.getAttribute('data-side')).toBe('right');
    expect(content.getAttribute('data-align')).toBe('start');
    expect(content.style.getPropertyValue('--primitives-context-menu-trigger-width')).toBe('var(--popper-anchor-width)');
    expect(content.style.getPropertyValue('--primitives-context-menu-trigger-height')).toBe('var(--popper-anchor-height)');
  });
});

describe('context-menu — submenu uncontrolled', () => {
  function mountWithSub(subProps: Record<string, unknown> = {}) {
    const Harness = defineComponent({
      setup() {
        return () =>
          h(ContextMenuRoot, { open: true }, {
            default: () => [
              h(ContextMenuTrigger, { 'data-testid': 'trigger' }, { default: () => 'Right-click me' }),
              h(ContextMenuPortal, null, {
                default: () =>
                  h(ContextMenuContent, null, {
                    default: () =>
                      h(ContextMenuSub, subProps, {
                        default: () => [
                          h(ContextMenuSubTrigger, { 'data-testid': 'sub-trigger' }, { default: () => 'More' }),
                          h(ContextMenuPortal, null, {
                            default: () =>
                              h(ContextMenuSubContent, null, {
                                default: () => h(ContextMenuItem, { 'data-testid': 'sub-item' }, { default: () => 'Sub item' }),
                              }),
                          }),
                        ],
                      }),
                  }),
              }),
            ],
          });
      },
    });
    return track(mount(Harness, { attachTo: document.body }));
  }

  it('renders the submenu open from the start when defaultOpen is set (uncontrolled)', async () => {
    mountWithSub({ defaultOpen: true });
    await nextTick();
    await nextTick();

    const subTrigger = document.querySelector('[data-testid="sub-trigger"]') as HTMLElement;
    expect(subTrigger).toBeTruthy();
    expect(subTrigger.getAttribute('data-state')).toBe('open');
    expect(document.querySelector('[data-testid="sub-item"]')).toBeTruthy();
  });

  it('keeps the submenu closed by default when defaultOpen is omitted', async () => {
    mountWithSub();
    await nextTick();
    await nextTick();

    const subTrigger = document.querySelector('[data-testid="sub-trigger"]') as HTMLElement;
    expect(subTrigger).toBeTruthy();
    expect(subTrigger.getAttribute('data-state')).toBe('closed');
    expect(document.querySelector('[data-testid="sub-item"]')).toBeFalsy();
  });
});
