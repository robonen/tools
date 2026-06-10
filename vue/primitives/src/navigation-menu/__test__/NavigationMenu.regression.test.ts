import type { VueWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';

import {
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuRoot,
  NavigationMenuTrigger,
  NavigationMenuViewport,
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

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface MountOptions {
  withViewport?: boolean;
  contentProps?: Record<string, unknown>;
}

function mountMenu(opts: MountOptions = {}) {
  const { withViewport = true, contentProps = {} } = opts;
  const items = ['products', 'company'];
  const Harness = defineComponent({
    setup() {
      return () => h(NavigationMenuRoot, null, {
        default: () => [
          h(NavigationMenuList, null, {
            default: () => items.map(value =>
              h(NavigationMenuItem, { value }, {
                default: () => [
                  h(NavigationMenuTrigger, { 'data-testid': `trigger-${value}` }, { default: () => value }),
                  h(NavigationMenuContent, contentProps, {
                    default: () => h(NavigationMenuLink, { href: '#' }, { default: () => `${value} link` }),
                  }),
                ],
              }),
            ),
          }),
          withViewport ? h(NavigationMenuViewport) : null,
        ],
      });
    },
  });
  return track(mount(Harness, { attachTo: document.body }));
}

function trigger(value = 'products'): HTMLElement {
  return document.querySelector<HTMLElement>(`[data-testid="trigger-${value}"]`)!;
}

function content(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-primitives-navigation-menu-content]');
}

function viewport(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-primitives-navigation-menu-viewport]');
}

describe('navigation-menu — active trigger collection (context shadowing)', () => {
  it('registers the trigger button (not the roving-focus span) in the nav collection', async () => {
    mountMenu();
    trigger().click();
    await nextTick();
    // The viewport position vars are derived from `activeTrigger`, which is
    // resolved by matching collection item ids against the trigger id pattern.
    await sleep(50);
    const vp = viewport()!;
    expect(vp).toBeTruthy();
    expect(vp.style.getPropertyValue('--primitives-navigation-menu-viewport-left')).not.toBe('');
    expect(vp.style.getPropertyValue('--primitives-navigation-menu-viewport-top')).not.toBe('');
    expect(vp.style.getPropertyValue('--primitives-navigation-menu-viewport-width')).not.toBe('');
    expect(vp.style.getPropertyValue('--primitives-navigation-menu-viewport-height')).not.toBe('');
  });
});

describe('navigation-menu — close lifecycle (content leak)', () => {
  it('unmounts the content after a full open/close cycle instead of leaking it inline', async () => {
    mountMenu();
    trigger().click();
    await nextTick();
    await sleep(50);
    expect(content()).toBeTruthy();

    trigger().click();
    await nextTick();
    await sleep(50);
    expect(trigger().getAttribute('data-state')).toBe('closed');
    expect(viewport()).toBeNull();
    // Regression: the isLastActiveValue latch used to keep the panel mounted
    // forever; with the viewport gone, Teleport rendered it inline in the nav.
    expect(content()).toBeNull();
  });

  it('keeps the previous content mounted during an item-to-item switch (crossfade)', async () => {
    mountMenu();
    trigger('products').click();
    await nextTick();
    await sleep(50);
    trigger('company').click();
    await nextTick();
    const all = document.querySelectorAll('[data-primitives-navigation-menu-content]');
    // Old panel is latched while the viewport is still mounted.
    expect(all.length).toBe(2);
  });
});

describe('navigation-menu — outside interaction dismiss', () => {
  it('closes the menu on pointerdown outside', async () => {
    mountMenu();
    trigger().click();
    await nextTick();
    await sleep(50);
    expect(trigger().getAttribute('data-state')).toBe('open');

    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await nextTick();
    await sleep(50);
    expect(trigger().getAttribute('data-state')).toBe('closed');
    expect(content()).toBeNull();
  });

  it('does not dismiss when the pointerdown is on the active trigger', async () => {
    mountMenu();
    trigger().click();
    await nextTick();
    await sleep(50);

    trigger().dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await nextTick();
    expect(trigger().getAttribute('data-state')).toBe('open');
  });
});

describe('navigation-menu — trigger click handling', () => {
  it('click toggles open then closed', async () => {
    mountMenu();
    const btn = trigger();
    btn.click();
    await nextTick();
    expect(btn.getAttribute('data-state')).toBe('open');
    btn.click();
    await nextTick();
    expect(btn.getAttribute('data-state')).toBe('closed');
  });

  it('stays closed after a click-close even if the pointer keeps moving over the trigger', async () => {
    mountMenu();
    const btn = trigger();
    btn.click();
    await nextTick();
    btn.click();
    await nextTick();
    expect(btn.getAttribute('data-state')).toBe('closed');

    // Pointer is still hovering: a pointermove must not re-open the menu
    // (wasClickClose must reflect the pre-click open state).
    btn.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse', bubbles: true }));
    await sleep(400); // > delayDuration (200ms)
    expect(btn.getAttribute('data-state')).toBe('closed');
  });

  it('opens immediately on click even right after a pointermove', async () => {
    mountMenu();
    const btn = trigger();
    btn.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    btn.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse', bubbles: true }));
    // Click before the 200ms hover debounce fires — must not be swallowed.
    btn.click();
    await nextTick();
    expect(btn.getAttribute('data-state')).toBe('open');
  });
});

describe('navigation-menu — content prop forwarding', () => {
  it('forwards `as` from NavigationMenuContent down to the rendered element', async () => {
    mountMenu({ contentProps: { as: 'section' } });
    trigger().click();
    await nextTick();
    await sleep(50);
    expect(content()).toBeTruthy();
    expect(content()!.tagName).toBe('SECTION');
  });
});
