import type { VueWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';

import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  useDropdownMenuRootContext,
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

describe('dropdownMenu — trigger forms safety + conditional aria-controls', () => {
  it('renders type="button" on the default button trigger to avoid form submission', () => {
    mountMenu();
    expect(trigger().getAttribute('type')).toBe('button');
  });

  it('only sets aria-controls while the menu is open (WAI-ARIA menu-button pattern)', async () => {
    mountMenu({ modal: false });
    expect(trigger().getAttribute('aria-controls')).toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');

    pointerDown(trigger());
    await flush();
    const controls = trigger().getAttribute('aria-controls');
    expect(controls).toBeTruthy();
    // aria-controls must point at the content element id when open.
    expect(menu()!.getAttribute('id')).toBe(controls);

    pointerDown(trigger());
    await flush();
    expect(trigger().getAttribute('aria-controls')).toBeNull();
  });

  it('omits type on a non-button trigger element', () => {
    const Harness = defineComponent({
      setup() {
        return () => h(DropdownMenuRoot, { modal: false }, {
          default: () => [
            h(DropdownMenuTrigger, { as: 'a', 'data-testid': 'trigger' }, { default: () => 'Open' }),
            h(DropdownMenuPortal, null, {
              default: () => h(DropdownMenuContent, null, { default: () => h(DropdownMenuItem, null, { default: () => 'One' }) }),
            }),
          ],
        });
      },
    });
    track(mount(Harness, { attachTo: document.body }));
    expect(trigger().tagName).toBe('A');
    expect(trigger().getAttribute('type')).toBeNull();
  });
});

describe('dropdownMenu — content sizing custom properties', () => {
  it('exposes dropdown-scoped CSS variables mapped from the popper anchor measurements', async () => {
    mountMenu({ modal: false });
    pointerDown(trigger());
    await flush();
    const style = menu()!.getAttribute('style') ?? '';
    expect(style).toContain('--primitives-dropdown-menu-trigger-width: var(--popper-anchor-width)');
    expect(style).toContain('--primitives-dropdown-menu-trigger-height: var(--popper-anchor-height)');
    expect(style).toContain('--primitives-dropdown-menu-content-transform-origin: var(--popper-transform-origin)');
  });
});

describe('dropdownMenu — focus return to trigger on close', () => {
  it('returns focus to the trigger when closed via Escape', async () => {
    mountMenu({ modal: false });
    pointerDown(trigger());
    await flush();
    expect(menu()).toBeTruthy();

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await flush();
    await flush();

    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('does not steal focus back to the trigger when the user interacts outside (non-modal)', async () => {
    mountMenu({ modal: false });
    pointerDown(trigger());
    await flush();
    expect(menu()).toBeTruthy();

    const outside = document.createElement('button');
    outside.id = 'outside';
    document.body.appendChild(outside);

    // A non-modal outside pointerdown dismisses the menu; focus must stay where
    // the user pointed rather than snapping back to the trigger.
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, composed: true, button: 0, pointerId: 1, pointerType: 'mouse' }));
    await flush();
    await flush();

    expect(menu()).toBeNull();
    expect(document.activeElement).not.toBe(trigger());

    outside.remove();
  });
});

describe('dropdownMenu — Sub controlled / uncontrolled', () => {
  function mountWithSub(opts: { defaultOpen?: boolean } = {}) {
    const seenOpen = ref<boolean | undefined>(undefined);
    const Harness = defineComponent({
      setup() {
        return () => h(DropdownMenuRoot, { modal: false, defaultOpen: true }, {
          default: () => h(DropdownMenuPortal, null, {
            default: () => h(DropdownMenuContent, null, {
              default: () => h(
                DropdownMenuSub,
                { defaultOpen: opts.defaultOpen },
                {
                  default: (slotProps: { open: boolean }) => {
                    seenOpen.value = slotProps.open;
                    return [
                      h(DropdownMenuSubTrigger, { class: 'sub-trigger' }, { default: () => 'More' }),
                      h(DropdownMenuSubContent, null, {
                        default: () => h(DropdownMenuItem, { class: 'sub-item' }, { default: () => 'Sub One' }),
                      }),
                    ];
                  },
                },
              ),
            }),
          }),
        });
      },
    });
    track(mount(Harness, { attachTo: document.body }));
    return { seenOpen };
  }

  it('exposes the current open value through the default slot', async () => {
    const { seenOpen } = mountWithSub({ defaultOpen: false });
    await flush();
    expect(seenOpen.value).toBe(false);
  });

  it('honours defaultOpen for uncontrolled submenus (open slot reflects it)', async () => {
    const { seenOpen } = mountWithSub({ defaultOpen: true });
    await flush();
    expect(seenOpen.value).toBe(true);
    expect(document.querySelector('.sub-item')).toBeTruthy();
  });
});

describe('dropdownMenu — enriched root context', () => {
  it('exposes open / onOpenToggle / modal / dir for composition', async () => {
    let ctx!: ReturnType<typeof useDropdownMenuRootContext>;
    const Consumer = defineComponent({
      setup() {
        ctx = useDropdownMenuRootContext();
        return () => null;
      },
    });
    const Harness = defineComponent({
      setup() {
        return () => h(DropdownMenuRoot, { modal: false, dir: 'rtl' }, {
          default: () => [
            h(DropdownMenuTrigger, { 'data-testid': 'trigger' }, { default: () => 'Open' }),
            h(Consumer),
          ],
        });
      },
    });
    track(mount(Harness, { attachTo: document.body }));
    await flush();

    expect(ctx.open.value).toBe(false);
    expect(ctx.modal.value).toBe(false);
    expect(ctx.dir.value).toBe('rtl');

    ctx.onOpenToggle();
    await flush();
    expect(ctx.open.value).toBe(true);

    ctx.onOpenChange(false);
    await flush();
    expect(ctx.open.value).toBe(false);
  });
});
