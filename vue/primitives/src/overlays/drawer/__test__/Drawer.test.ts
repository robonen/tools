import type { VueWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import {
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHandle,
  DrawerOverlay,
  DrawerPortal,
  DrawerRoot,
  DrawerTitle,
  DrawerTrigger,
} from '../index';

const wrappers: Array<VueWrapper<any>> = [];

afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
  document.body.removeAttribute('style');
  document.getElementById('robonen-drawer')?.remove();
});

function track<T extends VueWrapper<any>>(w: T): T {
  wrappers.push(w);
  return w;
}

/** Drains Vue's scheduler (including `flush: 'post'` watchers). */
async function flush(): Promise<void> {
  await nextTick();
  await nextTick();
  await nextTick();
}

function $<T extends Element = HTMLElement>(selector: string): T | null {
  return document.querySelector<T>(selector);
}

function $content(): HTMLElement | null {
  return $('[data-drawer]');
}

function $trigger(): HTMLElement {
  return $<HTMLElement>('[aria-haspopup="dialog"]')!;
}

function $close(): HTMLButtonElement | undefined {
  return [...document.querySelectorAll('button')].find(b => b.textContent === 'Close');
}

interface MountOptions {
  open?: boolean;
  defaultOpen?: boolean;
  modal?: boolean;
  dismissible?: boolean;
  direction?: 'top' | 'bottom' | 'left' | 'right';
  withHandle?: boolean;
  onUpdateOpen?: (v: boolean) => void;
  onClose?: () => void;
}

function mountDrawer(options: MountOptions = {}) {
  const { withHandle = true } = options;

  const Wrapper = defineComponent({
    setup() {
      return () => h(
        DrawerRoot,
        {
          open: options.open,
          defaultOpen: options.defaultOpen,
          modal: options.modal ?? true,
          dismissible: options.dismissible ?? true,
          direction: options.direction ?? 'bottom',
          'onUpdate:open': options.onUpdateOpen,
          onClose: options.onClose,
        },
        {
          default: () => [
            h(DrawerTrigger, null, { default: () => 'Open' }),
            h(DrawerPortal, null, {
              default: () => [
                h(DrawerOverlay, { 'data-testid': 'overlay' }),
                h(DrawerContent, null, {
                  default: () => [
                    withHandle ? h(DrawerHandle) : null,
                    h(DrawerTitle, null, { default: () => 'Title' }),
                    h(DrawerDescription, null, { default: () => 'Desc' }),
                    h(DrawerClose, null, { default: () => 'Close' }),
                  ],
                }),
              ],
            }),
          ],
        },
      );
    },
  });

  return track(mount(Wrapper, { attachTo: document.body }));
}

describe('Drawer / markup', () => {
  it('renders closed by default', () => {
    mountDrawer();
    expect($trigger().getAttribute('data-state')).toBe('closed');
    expect($content()).toBeNull();
  });

  it('injects the critical drawer stylesheet once', async () => {
    mountDrawer({ defaultOpen: true });
    await flush();
    const tags = document.querySelectorAll('#robonen-drawer');
    expect(tags.length).toBe(1);
    expect(tags[0]!.textContent).toContain('@keyframes slideFromBottom');
  });

  it('exposes drawer data attributes on the content when open', async () => {
    mountDrawer({ defaultOpen: true, direction: 'right' });
    await flush();
    const content = $content()!;
    expect(content.getAttribute('data-state')).toBe('open');
    expect(content.getAttribute('data-drawer-direction')).toBe('right');
    expect(content.hasAttribute('data-drawer')).toBe(true);
  });

  it('renders the handle without throwing (handleRef wiring)', async () => {
    mountDrawer({ defaultOpen: true, withHandle: true });
    await flush();
    expect($('[data-drawer-handle]')).toBeTruthy();
    expect($('[data-drawer-handle-hitarea]')).toBeTruthy();
  });
});

describe('Drawer / open state', () => {
  it('opens when the trigger is clicked (uncontrolled)', async () => {
    mountDrawer();
    $trigger().click();
    await flush();
    expect($content()).toBeTruthy();
  });

  it('closes when DrawerClose is clicked', async () => {
    mountDrawer({ defaultOpen: true });
    await flush();
    $close()!.click();
    await flush();
    // Presence keeps the node for the exit animation; data-state flips to closed.
    expect($content()?.getAttribute('data-state') ?? 'closed').toBe('closed');
  });

  it('emits update:open when the trigger is clicked (controlled)', async () => {
    const onUpdateOpen = vi.fn();
    mountDrawer({ open: false, onUpdateOpen });

    $trigger().click();
    await flush();
    expect(onUpdateOpen).toHaveBeenCalledWith(true);
  });

  it('emits close exactly once when dismissed via DrawerClose', async () => {
    const onClose = vi.fn();
    mountDrawer({ defaultOpen: true, onClose });
    await flush();

    $close()!.click();
    await flush();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('emits close when a controlled drawer is closed by flipping v-model:open', async () => {
    // Regression: closing purely by setting the bound `open` prop to false (not
    // via a dialog dismissal) must still run the close side effects.
    const onClose = vi.fn();
    const state = ref(true);
    const Wrapper = defineComponent({
      setup() {
        return () => h(
          DrawerRoot,
          {
            open: state.value,
            'onUpdate:open': (v: boolean) => { state.value = v; },
            onClose,
          },
          {
            default: () => h(DrawerPortal, null, {
              default: () => h(DrawerContent, null, {
                default: () => h(DrawerTitle, null, { default: () => 'Title' }),
              }),
            }),
          },
        );
      },
    });

    track(mount(Wrapper, { attachTo: document.body }));
    await flush();
    expect($content()).toBeTruthy();

    state.value = false;
    await flush();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('Drawer / overlay', () => {
  it('renders an overlay for modal drawers', async () => {
    mountDrawer({ defaultOpen: true, modal: true });
    await flush();
    expect($('[data-drawer-overlay]')).toBeTruthy();
  });

  it('omits the overlay for non-modal drawers', async () => {
    mountDrawer({ defaultOpen: true, modal: false });
    await flush();
    expect($('[data-drawer-overlay]')).toBeNull();
  });
});
