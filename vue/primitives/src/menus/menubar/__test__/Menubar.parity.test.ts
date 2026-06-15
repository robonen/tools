import type { VueWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';

import {
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarPortal,
  MenubarRoot,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from '../index';

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

function keydown(el: Element, key: string, init: KeyboardEventInit = {}) {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
}

function triggers(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-value]'));
}

function content(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role="menu"]');
}

/** A menubar with a content panel under each menu, optional disabled triggers. */
function mountFull(opts: { dir?: 'ltr' | 'rtl'; loop?: boolean; disabled?: string[] } = {}) {
  const labels = ['File', 'Edit', 'View'];
  const disabled = new Set(opts.disabled ?? []);
  const Harness = defineComponent({
    setup() {
      return () =>
        h(MenubarRoot, { dir: opts.dir, loop: opts.loop }, {
          default: () =>
            labels.map(label =>
              h(MenubarMenu, { value: label.toLowerCase() }, {
                default: () => [
                  h(MenubarTrigger, { disabled: disabled.has(label.toLowerCase()) }, { default: () => label }),
                  h(MenubarPortal, null, {
                    default: () =>
                      h(MenubarContent, null, {
                        default: () => h(MenubarItem, null, { default: () => `${label} item` }),
                      }),
                  }),
                ],
              }),
            ),
        });
    },
  });
  return track(mount(Harness, { attachTo: document.body }));
}

describe('menubar — roving tabindex (single tab stop)', () => {
  it('makes exactly one trigger tabbable; the first by default', async () => {
    mountFull();
    await nextTick();
    const all = triggers();
    expect(all.map(t => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
  });

  it('moves the single tab stop to whichever trigger is focused', async () => {
    mountFull();
    const [, edit] = triggers();
    edit!.focus();
    await nextTick();
    expect(triggers().map(t => t.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
  });

  it('never makes a disabled trigger the tab stop', async () => {
    mountFull({ disabled: ['file'] });
    await nextTick();
    const all = triggers();
    // File is disabled, so the first tabbable falls through to Edit.
    expect(all[0]!.getAttribute('tabindex')).toBe('-1');
    expect(all[1]!.getAttribute('tabindex')).toBe('0');
  });
});

describe('menubar — trigger attributes', () => {
  it('exposes data-value mirroring the menu value', () => {
    mountFull();
    expect(triggers().map(t => t.dataset['value'])).toEqual(['file', 'edit', 'view']);
  });

  it('sets data-highlighted only while the trigger has focus', async () => {
    mountFull();
    const [file] = triggers();
    expect(file!.hasAttribute('data-highlighted')).toBe(false);
    file!.focus();
    await nextTick();
    expect(file!.hasAttribute('data-highlighted')).toBe(true);
    file!.blur();
    await nextTick();
    expect(file!.hasAttribute('data-highlighted')).toBe(false);
  });

  it('omits aria-controls while the menu is closed and sets it once open', async () => {
    mountFull();
    const [file] = triggers();
    expect(file!.hasAttribute('aria-controls')).toBe(false);
    keydown(file!, 'Enter');
    await nextTick();
    await nextTick();
    expect(file!.getAttribute('aria-expanded')).toBe('true');
    expect(file!.getAttribute('aria-controls')).toBeTruthy();
  });
});

describe('menubar — content props', () => {
  it('honors a consumer-supplied align instead of forcing start', async () => {
    const Harness = defineComponent({
      setup() {
        return () =>
          h(MenubarRoot, { defaultValue: 'file' }, {
            default: () =>
              h(MenubarMenu, { value: 'file' }, {
                default: () => [
                  h(MenubarTrigger, null, { default: () => 'File' }),
                  h(MenubarPortal, null, {
                    default: () =>
                      h(MenubarContent, { align: 'end' }, {
                        default: () => h(MenubarItem, null, { default: () => 'x' }),
                      }),
                  }),
                ],
              }),
          });
      },
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    await nextTick();
    expect(content()!.getAttribute('data-align')).toBe('end');
  });

  it('exposes the menubar trigger-size CSS custom properties on the content', async () => {
    mountFull();
    const [file] = triggers();
    keydown(file!, 'Enter');
    await nextTick();
    await nextTick();
    const style = content()!.getAttribute('style') ?? '';
    expect(style).toContain('--primitives-menubar-trigger-width');
    expect(style).toContain('--primitives-menubar-trigger-height');
  });
});

describe('menubar — pointerdown guards', () => {
  it('ignores a macOS ctrl+click (does not open the menu)', async () => {
    mountFull();
    const [file] = triggers();
    file!.dispatchEvent(new PointerEvent('pointerdown', { button: 0, ctrlKey: true, bubbles: true, cancelable: true }));
    await nextTick();
    expect(file!.getAttribute('data-state')).toBe('closed');
  });

  it('opens on a plain left click', async () => {
    mountFull();
    const [file] = triggers();
    file!.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true, cancelable: true }));
    await nextTick();
    await nextTick();
    expect(file!.getAttribute('data-state')).toBe('open');
  });
});

describe('menubar — cross-menu arrow navigation while a menu is open', () => {
  it('ArrowRight inside open content switches to the next menubar menu (ltr)', async () => {
    mountFull();
    const [file] = triggers();
    keydown(file!, 'Enter');
    await nextTick();
    await nextTick();
    const panel = content();
    expect(panel).toBeTruthy();

    keydown(panel!, 'ArrowRight');
    await nextTick();
    await nextTick();
    // The Edit menu is now the open one.
    expect(triggers()[1]!.getAttribute('data-state')).toBe('open');
    expect(triggers()[0]!.getAttribute('data-state')).toBe('closed');
  });

  it('ArrowLeft inside open content switches to the previous menubar menu (ltr)', async () => {
    mountFull();
    const [, edit] = triggers();
    keydown(edit!, 'Enter');
    await nextTick();
    await nextTick();

    keydown(content()!, 'ArrowLeft');
    await nextTick();
    await nextTick();
    expect(triggers()[0]!.getAttribute('data-state')).toBe('open');
  });

  it('ArrowRight on the last menu loops to the first when loop=true', async () => {
    mountFull({ loop: true });
    const all = triggers();
    keydown(all.at(-1)!, 'Enter');
    await nextTick();
    await nextTick();

    keydown(content()!, 'ArrowRight');
    await nextTick();
    await nextTick();
    expect(triggers()[0]!.getAttribute('data-state')).toBe('open');
  });

  it('ArrowRight on the last menu stays put when loop=false', async () => {
    mountFull({ loop: false });
    const all = triggers();
    keydown(all.at(-1)!, 'Enter');
    await nextTick();
    await nextTick();

    keydown(content()!, 'ArrowRight');
    await nextTick();
    await nextTick();
    expect(triggers().at(-1)!.getAttribute('data-state')).toBe('open');
  });

  it('reverses the arrow direction in RTL', async () => {
    mountFull({ dir: 'rtl' });
    const [file] = triggers();
    keydown(file!, 'Enter');
    await nextTick();
    await nextTick();
    // In RTL the "next" key is ArrowLeft.
    keydown(content()!, 'ArrowLeft');
    await nextTick();
    await nextTick();
    expect(triggers()[1]!.getAttribute('data-state')).toBe('open');
  });
});

describe('menubar — focus restore on close', () => {
  it('does not yank focus back to the trigger after interacting outside', async () => {
    // An external focus target the user moves into.
    const outside = document.createElement('input');
    document.body.appendChild(outside);

    mountFull();
    const [file] = triggers();
    // Keyboard-open so the trigger would normally be refocused on close.
    keydown(file!, 'Enter');
    await nextTick();
    await nextTick();
    expect(content()).toBeTruthy();

    // User clicks/focuses an element outside the menu.
    outside.focus();
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    document.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await nextTick();
    await nextTick();
    await nextTick();

    // Focus stayed where the user put it (not snapped back to the trigger).
    expect(document.activeElement).not.toBe(file);
    outside.remove();
  });

  it('refocuses the trigger after a keyboard-open menu is closed via Escape', async () => {
    mountFull();
    const [file] = triggers();
    keydown(file!, 'Enter');
    await nextTick();
    await nextTick();
    const panel = content();
    expect(panel).toBeTruthy();

    keydown(panel!, 'Escape');
    await nextTick();
    await nextTick();
    await nextTick();
    expect(document.activeElement).toBe(file);
  });
});

describe('menubar — root slot', () => {
  it('exposes the open menu value to the default slot', async () => {
    const seen = ref<string | undefined>('untouched');
    const Harness = defineComponent({
      setup() {
        return () =>
          h(MenubarRoot, { defaultValue: 'edit' }, {

            default: (slotProps: any) => {
              seen.value = slotProps.modelValue;
              return h(MenubarMenu, { value: 'edit' }, {
                default: () => h(MenubarTrigger, null, { default: () => 'Edit' }),
              });
            },
          });
      },
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    expect(seen.value).toBe('edit');
  });
});

describe('menubar — submenu uncontrolled mode', () => {
  function mountWithSub(props: { defaultOpen?: boolean } = {}) {
    const Harness = defineComponent({
      setup() {
        return () =>
          h(MenubarRoot, { defaultValue: 'file' }, {
            default: () =>
              h(MenubarMenu, { value: 'file' }, {
                default: () => [
                  h(MenubarTrigger, null, { default: () => 'File' }),
                  h(MenubarPortal, null, {
                    default: () =>
                      h(MenubarContent, null, {
                        default: () =>
                          h(MenubarSub, { defaultOpen: props.defaultOpen }, {
                            default: () => [
                              h(MenubarSubTrigger, null, { default: () => 'More' }),
                              h(MenubarPortal, null, {
                                default: () =>
                                  h(MenubarSubContent, null, {
                                    default: () => h(MenubarItem, null, { default: () => 'Deep' }),
                                  }),
                              }),
                            ],
                          }),
                      }),
                  }),
                ],
              }),
          });
      },
    });
    return track(mount(Harness, { attachTo: document.body }));
  }

  it('opens the submenu initially when defaultOpen is true (uncontrolled)', async () => {
    mountWithSub({ defaultOpen: true });
    await nextTick();
    await nextTick();
    const subTrigger = document.querySelector<HTMLElement>('[data-primitives-menubar-subtrigger]');
    expect(subTrigger).toBeTruthy();
    expect(subTrigger!.getAttribute('data-state')).toBe('open');
  });

  it('keeps the submenu closed by default', async () => {
    mountWithSub();
    await nextTick();
    await nextTick();
    const subTrigger = document.querySelector<HTMLElement>('[data-primitives-menubar-subtrigger]');
    expect(subTrigger!.getAttribute('data-state')).toBe('closed');
  });

  it('marks the sub-trigger so cross-menu nav does not hijack the open key', async () => {
    mountWithSub();
    await nextTick();
    await nextTick();
    expect(document.querySelector('[data-primitives-menubar-subtrigger]')).toBeTruthy();
  });
});
