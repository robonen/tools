import type { VueWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-vue';
import { defineComponent, h, nextTick, ref } from 'vue';
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from '../index';

const wrappers: Array<VueWrapper<any>> = [];

afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
  document.body.removeAttribute('style');
  delete document.body.dataset['dismissableBlocking'];
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
  return $('[role="dialog"]');
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
  onUpdateOpen?: (v: boolean) => void;
  withDescription?: boolean;
}

function injectBodySibling(id: string): HTMLElement {
  const el = document.createElement('div');
  el.id = id;
  el.textContent = id;
  document.body.appendChild(el);
  return el;
}

function mountDialog(options: MountOptions = {}) {
  const { withDescription = true } = options;

  const Wrapper = defineComponent({
    setup() {
      return () => h(
        DialogRoot,
        {
          open: options.open,
          defaultOpen: options.defaultOpen,
          modal: options.modal ?? true,
          'onUpdate:open': options.onUpdateOpen,
        },
        {
          default: () => [
            h(DialogTrigger, null, { default: () => 'Open' }),
            h(DialogPortal, null, {
              default: () => [
                h(DialogOverlay, { 'data-testid': 'overlay' }),
                h(DialogContent, null, {
                  default: () => [
                    h(DialogTitle, null, { default: () => 'Title' }),
                    withDescription ? h(DialogDescription, null, { default: () => 'Desc' }) : null,
                    h(DialogClose, null, { default: () => 'Close' }),
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

describe('Dialog / markup', () => {
  it('renders closed by default', () => {
    mountDialog();
    const trigger = $trigger();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('data-state')).toBe('closed');
    expect($content()).toBeNull();
  });

  it('exposes data-state="open" on trigger and content when open', async () => {
    mountDialog({ defaultOpen: true });
    await flush();

    const trigger = $trigger();
    const content = $content()!;
    expect(trigger.getAttribute('data-state')).toBe('open');
    expect(content.getAttribute('data-state')).toBe('open');
  });

  it('resolves aria-labelledby / aria-describedby to the rendered title and description ids', async () => {
    mountDialog({ defaultOpen: true });
    await flush();

    const content = $content()!;
    const titleId = content.getAttribute('aria-labelledby');
    const descId = content.getAttribute('aria-describedby');
    expect(titleId && document.getElementById(titleId)?.textContent).toBe('Title');
    expect(descId && document.getElementById(descId)?.textContent).toBe('Desc');
  });

  it('does not set aria-describedby when description is absent', async () => {
    mountDialog({ defaultOpen: true, withDescription: false });
    await flush();

    const content = $content()!;
    const descId = content.getAttribute('aria-describedby');
    expect(!descId || !document.getElementById(descId)).toBe(true);
  });

  it('links trigger.aria-controls to the content id', async () => {
    mountDialog({ defaultOpen: true });
    await flush();

    const trigger = $trigger();
    const content = $content()!;
    expect(trigger.getAttribute('aria-controls')).toBe(content.id);
  });
});

describe('Dialog / open state', () => {
  it('opens when trigger is clicked (uncontrolled)', async () => {
    mountDialog();
    $trigger().click();
    await flush();
    expect($content()).toBeTruthy();
  });

  it('closes when DialogClose is clicked', async () => {
    mountDialog({ defaultOpen: true });
    await flush();
    $close()!.click();
    await flush();
    expect($content()).toBeNull();
  });

  it('closes on Escape key', async () => {
    mountDialog({ defaultOpen: true });
    await flush();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
    await flush();
    expect($content()).toBeNull();
  });

  it('supports a controlled open prop via v-model', async () => {
    const open = ref(false);
    const onUpdateOpen = vi.fn((v: boolean) => {
      open.value = v;
    });
    const Wrapper = defineComponent({
      setup() {
        return () => h(
          DialogRoot,
          { open: open.value, 'onUpdate:open': onUpdateOpen },
          {
            default: () => [
              h(DialogTrigger, null, { default: () => 'Open' }),
              h(DialogPortal, null, {
                default: () => h(DialogContent, null, {
                  default: () => h(DialogTitle, null, { default: () => 'T' }),
                }),
              }),
            ],
          },
        );
      },
    });
    track(mount(Wrapper, { attachTo: document.body }));

    $trigger().click();
    await flush();
    expect(onUpdateOpen).toHaveBeenCalledWith(true);
    expect(open.value).toBe(true);
    expect($content()).toBeTruthy();
  });

  it('re-opens cleanly after being closed', async () => {
    mountDialog();
    $trigger().click();
    await flush();
    expect($content()).toBeTruthy();

    $close()!.click();
    await flush();
    expect($content()).toBeNull();

    $trigger().click();
    await flush();
    expect($content()).toBeTruthy();
  });
});

describe('Dialog / modal vs non-modal', () => {
  it('modal: locks body scroll, aria-hides siblings, sets aria-modal', async () => {
    const a = injectBodySibling('sibling-a');
    const b = injectBodySibling('sibling-b');
    mountDialog({ defaultOpen: true, modal: true });
    await flush();

    const content = $content()!;
    expect(content.getAttribute('aria-modal')).toBe('true');
    expect(document.body.style.overflow).toBe('hidden');

    expect(a.getAttribute('aria-hidden')).toBe('true');
    expect(b.getAttribute('aria-hidden')).toBe('true');
  });

  it('modal: restores sibling aria-hidden on close', async () => {
    const a = injectBodySibling('sibling-a');
    mountDialog({ defaultOpen: true, modal: true });
    await flush();

    expect(a.getAttribute('aria-hidden')).toBe('true');

    $close()!.click();
    await flush();

    expect(a.getAttribute('aria-hidden')).toBeNull();
    expect(a.getAttribute('data-aria-hidden')).toBeNull();
  });

  it('non-modal: no body-scroll lock, no aria-hidden on siblings, no aria-modal', async () => {
    const a = injectBodySibling('sibling-a');
    mountDialog({ defaultOpen: true, modal: false });
    await flush();

    const content = $content()!;
    expect(content.getAttribute('aria-modal')).toBeNull();
    expect(document.body.style.overflow).not.toBe('hidden');

    expect(a.getAttribute('aria-hidden')).toBeNull();
  });

  it('non-modal: omits overlay', async () => {
    mountDialog({ defaultOpen: true, modal: false });
    await flush();

    const overlays = [...document.querySelectorAll<HTMLElement>('[data-state="open"]')]
      .filter(el => el.getAttribute('role') !== 'dialog' && !el.hasAttribute('aria-haspopup'));
    expect(overlays).toHaveLength(0);
  });

  it('modal: renders overlay with data-state="open"', async () => {
    mountDialog({ defaultOpen: true, modal: true });
    await flush();

    const overlay = document.querySelector<HTMLElement>('[data-testid="overlay"]');
    expect(overlay).toBeTruthy();
    expect(overlay!.getAttribute('data-state')).toBe('open');
  });
});

// -----------------------------------------------------------------------------
// Browser-only tests (real focus behaviour).
// -----------------------------------------------------------------------------

function settle() {
  return new Promise((r) => {
    requestAnimationFrame(() => requestAnimationFrame(() => r(null)));
  });
}

function mountInDom<T>(component: T) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  return render(component, { container: host });
}

const DialogBrowserHarness = defineComponent({
  setup() {
    const open = ref(false);
    return { open };
  },
  render() {
    return h(DialogRoot, {
      open: this.open,
      'onUpdate:open': (v: boolean) => { this.open = v; },
    }, {
      default: () => [
        h(DialogTrigger, { id: 'trigger' }, { default: () => 'Open' }),
        h(DialogPortal, null, {
          default: () => [
            h(DialogOverlay, { id: 'overlay' }),
            h(DialogContent, { id: 'content' }, {
              default: () => [
                h(DialogTitle, null, { default: () => 'Title' }),
                h(DialogDescription, null, { default: () => 'Desc' }),
                h('button', { id: 'first-inside' }, 'First'),
                h('button', { id: 'second-inside' }, 'Second'),
                h(DialogClose, { id: 'close' }, { default: () => 'Close' }),
              ],
            }),
          ],
        }),
      ],
    });
  },
});

describe('Dialog / focus (browser)', () => {
  it('moves focus into content on open and returns to trigger on close', async () => {
    const { container } = mountInDom(DialogBrowserHarness);
    const trigger = container.querySelector<HTMLButtonElement>('#trigger')!;
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    await userEvent.click(trigger);
    await settle();

    const content = document.querySelector<HTMLElement>('#content')!;
    expect(content.contains(document.activeElement)).toBe(true);

    await userEvent.keyboard('{Escape}');
    await settle();

    expect(document.querySelector('#content')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('close button closes dialog and restores focus to trigger', async () => {
    const { container } = mountInDom(DialogBrowserHarness);
    const trigger = container.querySelector<HTMLButtonElement>('#trigger')!;
    trigger.focus();
    await userEvent.click(trigger);
    await settle();

    await userEvent.click(document.querySelector<HTMLButtonElement>('#close')!);
    await settle();

    expect(document.querySelector('#content')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('Tab cycles focus inside the content (focus trap)', async () => {
    const { container } = mountInDom(DialogBrowserHarness);
    const trigger = container.querySelector<HTMLButtonElement>('#trigger')!;
    trigger.focus();
    await userEvent.click(trigger);
    await settle();

    const content = document.querySelector<HTMLElement>('#content')!;

    for (let i = 0; i < 6; i++) {
      await userEvent.keyboard('{Tab}');
      await settle();
      expect(content.contains(document.activeElement)).toBe(true);
    }
  });
});
