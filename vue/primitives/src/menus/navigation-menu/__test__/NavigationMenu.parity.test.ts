import type { VueWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';

import {
  NavigationMenuContent,
  NavigationMenuIndicator,
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

function press(el: Element, key: string, init: KeyboardEventInit = {}) {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
}

interface MenuMountOptions {
  withViewport?: boolean;
  contentProps?: Record<string, unknown>;
  contentSlot?: () => any;
  rootProps?: Record<string, unknown>;
  triggerProps?: Record<string, unknown>;
  itemProps?: Record<string, unknown>;
  listProps?: Record<string, unknown>;
}

function mountMenu(opts: MenuMountOptions = {}) {
  const {
    withViewport = true,
    contentProps = {},
    contentSlot,
    rootProps = {},
    triggerProps = {},
    itemProps = {},
    listProps = {},
  } = opts;
  const items = ['products', 'company'];
  const Harness = defineComponent({
    setup() {
      return () => h(NavigationMenuRoot, rootProps, {
        default: () => [
          h(NavigationMenuList, listProps, {
            default: () => items.map(value =>
              h(NavigationMenuItem, { value, ...itemProps }, {
                default: () => [
                  h(NavigationMenuTrigger, { 'data-testid': `trigger-${value}`, ...triggerProps }, { default: () => value }),
                  h(NavigationMenuContent, { 'data-testid': `content-${value}`, ...contentProps }, {
                    default: contentSlot ?? (() => h(NavigationMenuLink, { href: '#' }, { default: () => `${value} link` })),
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

function content(value?: string): HTMLElement | null {
  if (value) return document.querySelector<HTMLElement>(`[data-testid="content-${value}"]`);
  return document.querySelector<HTMLElement>('[data-primitives-navigation-menu-content]');
}

describe('navigation-menu — polymorphism (as)', () => {
  it('renders the root as a custom element when `as` is supplied', () => {
    mountMenu({ rootProps: { as: 'div' } });
    expect(document.querySelector('nav')).toBeNull();
    const root = document.querySelector('[data-primitives-navigation-menu]') as HTMLElement;
    expect(root.tagName).toBe('DIV');
    // landmark label fallback still applies
    expect(root.getAttribute('aria-label')).toBe('Main');
  });

  it('defaults the root to a <nav> landmark when `as` is omitted', () => {
    mountMenu();
    expect(document.querySelector('nav')).toBeTruthy();
  });

  it('renders the trigger as a custom element', async () => {
    mountMenu({ triggerProps: { as: 'a', href: '#go' } });
    const t = trigger();
    expect(t.tagName).toBe('A');
    // non-button triggers must not get type="button"
    expect(t.getAttribute('type')).toBeNull();
  });

  it('keeps type="button" for the default button trigger', () => {
    mountMenu();
    expect(trigger().getAttribute('type')).toBe('button');
  });

  it('renders the item as a custom element (default li)', () => {
    mountMenu();
    expect(document.querySelector('li[data-primitives-navigation-menu-item]')).toBeTruthy();
    mountMenu({ itemProps: { as: 'div' } });
    expect(document.querySelector('div[data-primitives-navigation-menu-item]')).toBeTruthy();
  });

  it('renders the list inner element as a custom element (default ul)', () => {
    mountMenu();
    expect(document.querySelector('ul[data-primitives-navigation-menu-list]')).toBeTruthy();
    mountMenu({ listProps: { as: 'div' } });
    expect(document.querySelector('div[data-primitives-navigation-menu-list]')).toBeTruthy();
  });
});

describe('navigation-menu — indicator a11y/polymorphism', () => {
  it('marks the indicator aria-hidden and supports `as`', async () => {
    const Harness = defineComponent({
      setup() {
        return () => h(NavigationMenuRoot, null, {
          default: () => h(NavigationMenuList, null, {
            default: () => [
              h(NavigationMenuItem, { value: 'a' }, {
                default: () => h(NavigationMenuTrigger, { 'data-testid': 'trigger-a' }, { default: () => 'a' }),
              }),
              h(NavigationMenuIndicator, { as: 'span' }),
            ],
          }),
        });
      },
    });
    track(mount(Harness, { attachTo: document.body }));
    // open so the indicator becomes present
    trigger('a').click();
    await nextTick();
    await sleep(20);
    const indicator = document.querySelector('[data-primitives-navigation-menu-indicator]') as HTMLElement;
    expect(indicator).toBeTruthy();
    expect(indicator.getAttribute('aria-hidden')).toBe('true');
    expect(indicator.tagName).toBe('SPAN');
  });
});

describe('navigation-menu — content hidden/pointer-events when not present', () => {
  it('removes the hidden attribute on the open content panel', async () => {
    mountMenu();
    trigger().click();
    await nextTick();
    await sleep(50);
    const panel = content('products')!;
    expect(panel).toBeTruthy();
    expect(panel.hasAttribute('hidden')).toBe(false);
  });
});

describe('navigation-menu — DismissableLayer prop forwarding', () => {
  it('forwards disableOutsidePointerEvents from content to the dismissable layer (body becomes inert)', async () => {
    mountMenu({ contentProps: { disableOutsidePointerEvents: true } });
    trigger().click();
    await nextTick();
    await sleep(50);
    // DismissableLayer applies pointer-events:none to document.body when a layer
    // with disableOutsidePointerEvents is active.
    expect(document.body.style.pointerEvents).toBe('none');
  });

  it('does not make the body inert by default (disableOutsidePointerEvents off)', async () => {
    mountMenu();
    trigger().click();
    await nextTick();
    await sleep(50);
    expect(document.body.style.pointerEvents).not.toBe('none');
  });
});

describe('navigation-menu — arrow navigation bail-out for text fields', () => {
  it('does not move focus away from an INPUT inside the content on ArrowDown', async () => {
    mountMenu({
      contentSlot: () => [
        h('input', { 'data-testid': 'field', 'data-primitives-collection-item': '' }),
        h(NavigationMenuLink, { href: '#', 'data-testid': 'link' }, { default: () => 'link' }),
      ],
    });
    trigger().click();
    await nextTick();
    await sleep(50);
    const field = document.querySelector<HTMLInputElement>('[data-testid="field"]')!;
    field.focus();
    expect(document.activeElement).toBe(field);
    press(content('products')!, 'ArrowDown');
    await nextTick();
    // Focus must stay in the text field (native caret movement), not jump to the link.
    expect(document.activeElement).toBe(field);
  });
});

describe('navigation-menu — link select payload', () => {
  it('emits select with detail.originalEvent', async () => {
    const selectEvents: CustomEvent[] = [];
    const Harness = defineComponent({
      setup() {
        return () => h(NavigationMenuRoot, null, {
          default: () => h(NavigationMenuList, null, {
            default: () => h(NavigationMenuItem, { value: 'a' }, {
              default: () => h(NavigationMenuLink, {
                href: '#',
                'data-testid': 'plainlink',
                onSelect: (e: CustomEvent) => selectEvents.push(e),
              }, { default: () => 'link' }),
            }),
          }),
        });
      },
    });
    track(mount(Harness, { attachTo: document.body }));
    const link = document.querySelector<HTMLElement>('[data-testid="plainlink"]')!;
    link.click();
    await nextTick();
    expect(selectEvents.length).toBe(1);
    expect(selectEvents[0]!.detail).toBeTruthy();
    expect(selectEvents[0]!.detail.originalEvent).toBeInstanceOf(Event);
  });

  it('keeps the menu open when select is prevented', async () => {
    mountMenu({
      contentSlot: () => h(NavigationMenuLink, {
        href: '#',
        'data-testid': 'prevlink',
        onSelect: (e: CustomEvent) => e.preventDefault(),
      }, { default: () => 'link' }),
    });
    trigger().click();
    await nextTick();
    await sleep(50);
    expect(trigger().getAttribute('data-state')).toBe('open');
    const link = document.querySelector<HTMLElement>('[data-testid="prevlink"]')!;
    link.click();
    await nextTick();
    await sleep(50);
    expect(trigger().getAttribute('data-state')).toBe('open');
  });
});

describe('navigation-menu — item keyboard close + focus return', () => {
  it('closes and returns focus to the trigger on Enter when open', async () => {
    mountMenu();
    const btn = trigger();
    btn.click();
    await nextTick();
    await sleep(20);
    expect(btn.getAttribute('data-state')).toBe('open');
    btn.focus();
    press(btn, 'Enter');
    await nextTick();
    await sleep(20);
    expect(btn.getAttribute('data-state')).toBe('closed');
    expect(document.activeElement).toBe(btn);
  });

  it('closes and returns focus to the trigger on Space when open', async () => {
    mountMenu();
    const btn = trigger();
    btn.click();
    await nextTick();
    await sleep(20);
    btn.focus();
    press(btn, ' ');
    await nextTick();
    await sleep(20);
    expect(btn.getAttribute('data-state')).toBe('closed');
    expect(document.activeElement).toBe(btn);
  });
});
