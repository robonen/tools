import type { VueWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';

import { MenubarMenu, MenubarRoot, MenubarTrigger } from '../index';

const wrappers: Array<VueWrapper<any>> = [];

afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
});

function track<T extends VueWrapper<any>>(w: T): T {
  wrappers.push(w);
  return w;
}

function mountBar(opts: { dir?: 'ltr' | 'rtl'; loop?: boolean; labels?: string[] } = {}) {
  const labels = opts.labels ?? ['File', 'Edit', 'View', 'Help'];
  const Harness = defineComponent({
    setup() {
      return () => h(
        MenubarRoot,
        { dir: opts.dir, loop: opts.loop },
        {
          default: () =>
            labels.map(label =>
              h(MenubarMenu, { value: label.toLowerCase() }, {
                default: () => h(MenubarTrigger, null, { default: () => label }),
              }),
            ),
        },
      );
    },
  });
  return track(mount(Harness, { attachTo: document.body }));
}

function triggers(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]'));
}

describe('menubar — root a11y', () => {
  it('exposes role=menubar with aria-orientation=horizontal', () => {
    mountBar();
    const bar = document.querySelector('[role="menubar"]') as HTMLElement;
    expect(bar).toBeTruthy();
    expect(bar.getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('applies the dir attribute on the menubar root', () => {
    mountBar({ dir: 'rtl' });
    const bar = document.querySelector('[role="menubar"]') as HTMLElement;
    expect(bar.getAttribute('dir')).toBe('rtl');
  });
});

describe('menubar — keyboard navigation between triggers', () => {
  it('ArrowRight moves focus to the next trigger (ltr)', async () => {
    mountBar();
    const [file, edit] = triggers();
    file!.focus();
    file!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    await nextTick();
    expect(document.activeElement).toBe(edit);
  });

  it('ArrowLeft moves focus to the previous trigger (ltr)', async () => {
    mountBar();
    const [, edit, view] = triggers();
    view!.focus();
    view!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    await nextTick();
    expect(document.activeElement).toBe(edit);
  });

  it('ArrowRight on the last trigger loops to the first when loop=true', async () => {
    mountBar({ loop: true });
    const all = triggers();
    const last = all.at(-1)!;
    last.focus();
    last.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    await nextTick();
    expect(document.activeElement).toBe(all[0]);
  });

  it('ArrowRight on the last trigger stays put when loop=false', async () => {
    mountBar({ loop: false });
    const all = triggers();
    const last = all.at(-1)!;
    last.focus();
    last.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    await nextTick();
    expect(document.activeElement).toBe(last);
  });

  it('Home / End jump to the first / last trigger', async () => {
    mountBar();
    const all = triggers();
    all[1]!.focus();
    all[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
    await nextTick();
    expect(document.activeElement).toBe(all.at(-1));

    all.at(-1)!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
    await nextTick();
    expect(document.activeElement).toBe(all[0]);
  });

  it('reverses ArrowLeft/ArrowRight in RTL', async () => {
    mountBar({ dir: 'rtl' });
    const [file, edit] = triggers();
    file!.focus();
    // In RTL the "forward" key is ArrowLeft.
    file!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    await nextTick();
    expect(document.activeElement).toBe(edit);
  });
});

describe('menubar — typeahead', () => {
  it('jumps focus to the trigger whose label starts with the typed letter', async () => {
    mountBar();
    const bar = document.querySelector('[role="menubar"]') as HTMLElement;
    const [file, , view] = triggers();
    file!.focus();
    // Typeahead is wired on the menubar root via keydown.capture, so dispatching
    // on the focused trigger (which bubbles up) is equivalent to the user typing
    // while focus is in the bar.
    bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', bubbles: true }));
    await nextTick();
    expect(document.activeElement).toBe(view);
  });

  it('ignores modified key combinations for typeahead', async () => {
    mountBar();
    const bar = document.querySelector('[role="menubar"]') as HTMLElement;
    const [file] = triggers();
    file!.focus();
    bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, bubbles: true }));
    await nextTick();
    expect(document.activeElement).toBe(file);
  });
});
