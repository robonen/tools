import type { VueWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';

import {
  MenuAnchor,
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
} from '../index';
import { ITEM_SELECT } from '../utils';

const wrappers: Array<VueWrapper<any>> = [];

afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
  document.body.style.pointerEvents = '';
});

function track<T extends VueWrapper<any>>(w: T): T {
  wrappers.push(w);
  return w;
}

interface MountMenuOptions {
  modal?: boolean;
  onSelect?: (event: Event) => void;
  items?: () => unknown;
}

function mountMenu(options: MountMenuOptions = {}) {
  const open = ref(false);
  const Harness = defineComponent({
    setup() {
      return () => h(
        MenuRoot,
        {
          open: open.value,
          'onUpdate:open': (v: boolean) => { open.value = v; },
          modal: options.modal,
        },
        {
          default: () => [
            h(MenuAnchor, null, { default: () => h('button', { type: 'button' }, 'Anchor') }),
            h(MenuContent, null, {
              default: () => options.items?.() ?? [
                h(MenuItem, { class: 'consumer-item', onSelect: options.onSelect }, { default: () => 'Alpha' }),
                h(MenuItem, null, { default: () => 'Bravo' }),
                h(MenuItem, null, { default: () => 'Charlie' }),
              ],
            }),
          ],
        },
      );
    },
  });
  track(mount(Harness, { attachTo: document.body }));
  return { open };
}

async function openMenu(open: { value: boolean }) {
  open.value = true;
  await nextTick();
  await nextTick();
}

function content(): HTMLElement {
  return document.querySelector<HTMLElement>('[role="menu"]')!;
}

function items(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]'));
}

function usePointer() {
  // Flip the shared isUsingKeyboard ref into "pointer" mode.
  document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
}

function keydown(el: HTMLElement, key: string) {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

describe('menu — item rendering (roving focus merged onto the item element)', () => {
  it('puts consumer class, roving tab stop, and collection registration on the menuitem itself', async () => {
    const { open } = mountMenu();
    await openMenu(open);

    const [alpha] = items();
    expect(alpha).toBeTruthy();
    expect(alpha!.classList.contains('consumer-item')).toBe(true);
    expect(alpha!.hasAttribute('data-collection-item')).toBe(true);
    expect(alpha!.hasAttribute('tabindex')).toBe(true);
    // No wrapper span between the content and the item.
    expect(alpha!.parentElement?.getAttribute('role')).toBe('menu');
  });

  it('sets data-highlighted on the same element that carries consumer attrs on hover', async () => {
    const { open } = mountMenu();
    await openMenu(open);

    const [alpha] = items();
    alpha!.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse' }));
    await nextTick();

    expect(document.activeElement).toBe(alpha);
    expect(alpha!.hasAttribute('data-highlighted')).toBe(true);
    expect(alpha!.classList.contains('consumer-item')).toBe(true);
  });
});

describe('menu — keyboard navigation after a pointer-open', () => {
  it('focuses the content on mount so key events reach the menu', async () => {
    usePointer();
    const { open } = mountMenu();
    await openMenu(open);

    expect(document.activeElement).toBe(content());
  });

  it('ArrowDown from the content focuses the first item, then roves to the next', async () => {
    usePointer();
    const { open } = mountMenu();
    await openMenu(open);

    keydown(content(), 'ArrowDown');
    await nextTick();
    expect(document.activeElement).toBe(items()[0]);

    keydown(items()[0]!, 'ArrowDown');
    await nextTick();
    expect(document.activeElement).toBe(items()[1]);
  });

  it('End from the content focuses the last item', async () => {
    usePointer();
    const { open } = mountMenu();
    await openMenu(open);

    keydown(content(), 'End');
    await nextTick();
    expect(document.activeElement).toBe(items().at(-1));
  });

  it('Enter on the focused item selects it and closes the menu', async () => {
    usePointer();
    const selected: Event[] = [];
    const { open } = mountMenu({ onSelect: e => selected.push(e) });
    await openMenu(open);

    keydown(content(), 'ArrowDown');
    keydown(items()[0]!, 'Enter');
    await nextTick();

    expect(selected).toHaveLength(1);
    expect(open.value).toBe(false);
  });
});

describe('menu — dismissal', () => {
  it('closes on Escape and releases the modal body pointer-events lock', async () => {
    const { open } = mountMenu();
    await openMenu(open);
    expect(document.body.style.pointerEvents).toBe('none');

    keydown(document.body, 'Escape');
    await nextTick();
    await nextTick();

    expect(open.value).toBe(false);
    expect(content()).toBeNull();
    expect(document.body.style.pointerEvents).not.toBe('none');
  });

  it('closes on pointerdown outside the content', async () => {
    const { open } = mountMenu();
    await openMenu(open);

    document.documentElement.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await nextTick();
    await nextTick();

    expect(open.value).toBe(false);
    expect(content()).toBeNull();
  });

  it('closes a non-modal menu on Escape too', async () => {
    const { open } = mountMenu({ modal: false });
    await openMenu(open);
    expect(document.body.style.pointerEvents).not.toBe('none');

    keydown(document.body, 'Escape');
    await nextTick();

    expect(open.value).toBe(false);
  });
});

describe('menu — @select contract', () => {
  it('emits the cancelable ITEM_SELECT event to the consumer', async () => {
    const selected: Event[] = [];
    const { open } = mountMenu({ onSelect: e => selected.push(e) });
    await openMenu(open);

    items()[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();

    expect(selected).toHaveLength(1);
    expect(selected[0]!.type).toBe(ITEM_SELECT);
    expect(open.value).toBe(false);
  });

  it('keeps the menu open when the consumer calls event.preventDefault() in @select', async () => {
    const { open } = mountMenu({ onSelect: e => e.preventDefault() });
    await openMenu(open);

    items()[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();

    expect(open.value).toBe(true);
    expect(content()).toBeTruthy();
  });
});

describe('menu — submenu trigger', () => {
  function mountWithSub() {
    const subOpen = ref(false);
    const menu = mountMenu({
      items: () => [
        h(MenuItem, null, { default: () => 'Alpha' }),
        h(MenuSub, {
          open: subOpen.value,
          'onUpdate:open': (v: boolean) => { subOpen.value = v; },
        }, {
          default: () => [
            h(MenuSubTrigger, { class: 'sub-trigger' }, { default: () => 'More' }),
            h(MenuSubContent, null, {
              default: () => h(MenuItem, null, { default: () => 'Nested' }),
            }),
          ],
        }),
      ],
    });
    return { ...menu, subOpen };
  }

  it('renders as a single element: consumer class and data-state on the menuitem, no anchor wrapper', async () => {
    const { open } = mountWithSub();
    await openMenu(open);

    const trigger = document.querySelector<HTMLElement>('.sub-trigger')!;
    expect(trigger.getAttribute('role')).toBe('menuitem');
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('data-state')).toBe('closed');
    expect(trigger.parentElement?.getAttribute('role')).toBe('menu');
  });

  it('opens the submenu on click', async () => {
    const { open, subOpen } = mountWithSub();
    await openMenu(open);

    const trigger = document.querySelector<HTMLElement>('.sub-trigger')!;
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    await nextTick();

    expect(subOpen.value).toBe(true);
    expect(trigger.getAttribute('data-state')).toBe('open');
    const menus = document.querySelectorAll('[role="menu"]');
    expect(menus.length).toBe(2);
  });
});
