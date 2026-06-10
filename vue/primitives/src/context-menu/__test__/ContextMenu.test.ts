import type { VueWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';

import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuPortal,
  ContextMenuRoot,
  ContextMenuTrigger,
} from '../../index';

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
  onUpdateOpen?: (v: boolean) => void;
} = {}) {
  const Harness = defineComponent({
    setup() {
      return () =>
        h(
          ContextMenuRoot,
          { 'onUpdate:open': options.onUpdateOpen },
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
});
