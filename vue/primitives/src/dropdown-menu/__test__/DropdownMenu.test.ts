import type { VueWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';

import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from '../index';

const wrappers: Array<VueWrapper<any>> = [];

afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
});

function track<T extends VueWrapper<any>>(w: T): T {
  wrappers.push(w);
  return w;
}

function mountMenu(opts: { modal?: boolean } = {}) {
  const Harness = defineComponent({
    setup() {
      return () => h(
        DropdownMenuRoot,
        { modal: opts.modal },
        {
          default: () => [
            h(
              DropdownMenuTrigger,
              { 'data-testid': 'trigger', class: 'demo-trigger' },
              { default: () => 'Open' },
            ),
            h(DropdownMenuPortal, null, {
              default: () => h(DropdownMenuContent, null, {
                default: () => [
                  h(DropdownMenuItem, null, { default: () => 'One' }),
                  h(DropdownMenuItem, null, { default: () => 'Two' }),
                ],
              }),
            }),
          ],
        },
      );
    },
  });
  return track(mount(Harness, { attachTo: document.body }));
}

function trigger(): HTMLElement {
  return document.querySelector<HTMLElement>('[data-testid="trigger"]')!;
}

function menu(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role="menu"]');
}

function pointerDown(el: EventTarget) {
  el.dispatchEvent(new PointerEvent('pointerdown', {
    bubbles: true,
    cancelable: true,
    composed: true,
    button: 0,
    pointerId: 1,
    pointerType: 'mouse',
  }));
}

async function flush() {
  await nextTick();
  await nextTick();
}

describe('dropdownMenu — trigger renders as the anchor itself', () => {
  it('merges fallthrough attrs onto the trigger button (no anchor wrapper element)', () => {
    mountMenu();
    const el = trigger();
    // Pre-fix, MenuAnchor rendered a real <div> wrapper that swallowed
    // fallthrough attrs while data-state/aria stayed on the inner button.
    expect(el.tagName).toBe('BUTTON');
    expect(el.classList.contains('demo-trigger')).toBe(true);
    expect(el.getAttribute('aria-haspopup')).toBe('menu');
    expect(el.getAttribute('data-state')).toBe('closed');
    expect(el.querySelector('button')).toBeNull();
  });

  it('flips data-state/aria-expanded on the attr-bearing element when opened', async () => {
    mountMenu({ modal: false });
    pointerDown(trigger());
    await flush();
    expect(menu()).toBeTruthy();
    expect(trigger().getAttribute('data-state')).toBe('open');
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
  });
});

describe('dropdownMenu — trigger pointerdown toggling (non-modal)', () => {
  it('closes on trigger pointerdown while open and does not reopen from the dismiss race', async () => {
    mountMenu({ modal: false });

    pointerDown(trigger());
    await flush();
    expect(menu()).toBeTruthy();

    // The outside-pointerdown dismiss (window capture) runs before the
    // trigger's own handler — without the content-side guard the menu would
    // close via dismiss and instantly reopen via the trigger toggle.
    pointerDown(trigger());
    await flush();
    expect(menu()).toBeNull();
    expect(trigger().getAttribute('data-state')).toBe('closed');

    await flush();
    expect(menu()).toBeNull();
  });

  it('reopens on the next trigger pointerdown after a toggle-close', async () => {
    mountMenu({ modal: false });

    pointerDown(trigger());
    await flush();
    pointerDown(trigger());
    await flush();
    expect(menu()).toBeNull();

    pointerDown(trigger());
    await flush();
    expect(menu()).toBeTruthy();
    expect(trigger().getAttribute('data-state')).toBe('open');
  });
});

describe('dropdownMenu — trigger keyboard open', () => {
  it('opens the menu on Enter', async () => {
    mountMenu({ modal: false });
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await flush();
    expect(menu()).toBeTruthy();
    expect(trigger().getAttribute('data-state')).toBe('open');
  });
});
