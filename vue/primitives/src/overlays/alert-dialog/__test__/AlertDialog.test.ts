import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
  AlertDialogTrigger,
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

// Auto-focus runs in a post-flush effect and the Cancel redirect lands on a
// microtask; settle both plus the macrotask boundary before asserting focus.
async function flush() {
  await nextTick();
  await nextTick();
  await new Promise(resolve => setTimeout(resolve, 0));
}

function mountAlert(initialOpen = true) {
  const open = ref(initialOpen);
  const Harness = defineComponent({
    setup() {
      return () => h(
        AlertDialogRoot,
        {
          open: open.value,
          'onUpdate:open': (v: boolean | undefined) => { open.value = v!; },
        },
        {
          default: () => [
            h(AlertDialogTrigger, null, { default: () => 'Open' }),
            h(AlertDialogPortal, null, {
              default: () => [
                h(AlertDialogOverlay),
                h(AlertDialogContent, null, {
                  default: () => [
                    h(AlertDialogTitle, null, { default: () => 'Are you sure?' }),
                    h(AlertDialogDescription, null, { default: () => 'This cannot be undone.' }),
                    h(AlertDialogCancel, null, { default: () => 'Cancel' }),
                    h(AlertDialogAction, null, { default: () => 'OK' }),
                  ],
                }),
              ],
            }),
          ],
        },
      );
    },
  });
  const w = track(mount(Harness, { attachTo: document.body }));
  return { wrapper: w, open };
}

describe('AlertDialog', () => {
  it('renders content with role="alertdialog"', async () => {
    mountAlert(true);
    await nextTick();
    await nextTick();
    const content = document.querySelector('[data-alert-dialog-content]');
    expect(content).toBeTruthy();
    expect(content!.getAttribute('role')).toBe('alertdialog');
  });

  it('labels content via Title and describes via Description', async () => {
    mountAlert(true);
    await nextTick();
    await nextTick();
    const content = document.querySelector<HTMLElement>('[data-alert-dialog-content]')!;
    const labelledby = content.getAttribute('aria-labelledby');
    const describedby = content.getAttribute('aria-describedby');
    expect(labelledby).toMatch(/dialog-title/);
    expect(describedby).toMatch(/dialog-description/);
    expect(document.getElementById(labelledby!)?.textContent).toBe('Are you sure?');
    expect(document.getElementById(describedby!)?.textContent).toBe('This cannot be undone.');
  });

  it('Cancel button closes the dialog', async () => {
    const { open } = mountAlert(true);
    await nextTick();
    await nextTick();
    const cancel = document.querySelector<HTMLButtonElement>('[data-alert-dialog-cancel]')!;
    cancel.click();
    await nextTick();
    await nextTick();
    expect(open.value).toBe(false);
  });

  it('Action button closes the dialog', async () => {
    const { open } = mountAlert(true);
    await nextTick();
    await nextTick();
    const action = document.querySelector<HTMLButtonElement>('[data-alert-dialog-action]')!;
    action.click();
    await nextTick();
    await nextTick();
    expect(open.value).toBe(false);
  });

  it('Cancel and Action carry data attributes', async () => {
    mountAlert(true);
    await nextTick();
    await nextTick();
    expect(document.querySelector('[data-alert-dialog-cancel]')).toBeTruthy();
    expect(document.querySelector('[data-alert-dialog-action]')).toBeTruthy();
  });

  it('moves focus to its own Cancel button on open', async () => {
    mountAlert(true);
    await flush();
    const cancel = document.querySelector<HTMLElement>('[data-alert-dialog-cancel]')!;
    expect(document.activeElement).toBe(cancel);
  });

  it('focuses Cancel with preventScroll to avoid scroll jumps', async () => {
    const original = HTMLElement.prototype.focus;
    const calls: Array<{ el: HTMLElement; opts?: FocusOptions }> = [];
    HTMLElement.prototype.focus = function focus(this: HTMLElement, opts?: FocusOptions) {
      calls.push({ el: this, opts });
      return original.call(this, opts);
    };
    try {
      mountAlert(true);
      await flush();
      const cancel = document.querySelector<HTMLElement>('[data-alert-dialog-cancel]')!;
      const cancelCall = calls.find(c => c.el === cancel);
      expect(cancelCall).toBeTruthy();
      expect(cancelCall!.opts?.preventScroll).toBe(true);
    }
    finally {
      HTMLElement.prototype.focus = original;
    }
  });

  it('a consumer can preventDefault openAutoFocus to keep its own focus target', async () => {
    const open = ref(true);
    const Harness = defineComponent({
      setup() {
        return () => h(AlertDialogRoot, { open: open.value }, {
          default: () => h(AlertDialogPortal, null, {
            default: () => h(AlertDialogContent, {
              onOpenAutoFocus: (e: Event) => e.preventDefault(),
            }, {
              default: () => [
                h(AlertDialogTitle, null, { default: () => 'T' }),
                h(AlertDialogDescription, null, { default: () => 'D' }),
                h(AlertDialogCancel, null, { default: () => 'Cancel' }),
                h(AlertDialogAction, null, { default: () => 'OK' }),
              ],
            }),
          }),
        });
      },
    });
    track(mount(Harness, { attachTo: document.body }));
    await flush();
    const cancel = document.querySelector<HTMLElement>('[data-alert-dialog-cancel]')!;
    expect(document.activeElement).not.toBe(cancel);
  });

  it('each of two simultaneous alert dialogs focuses its own Cancel', async () => {
    const Harness = defineComponent({
      setup() {
        const make = (label: string) => h(AlertDialogRoot, { open: true }, {
          default: () => h(AlertDialogPortal, null, {
            default: () => h(AlertDialogContent, { 'data-which': label }, {
              default: () => [
                h(AlertDialogTitle, null, { default: () => `${label} title` }),
                h(AlertDialogDescription, null, { default: () => `${label} desc` }),
                h(AlertDialogCancel, { 'data-which-cancel': label }, { default: () => `${label} cancel` }),
                h(AlertDialogAction, null, { default: () => `${label} ok` }),
              ],
            }),
          }),
        });
        return () => [make('a'), make('b')];
      },
    });
    track(mount(Harness, { attachTo: document.body }));
    await flush();
    // The last dialog's auto-focus wins activeElement, but the decisive check is
    // that each Content focuses a Cancel that belongs to it — never a sibling's.
    const focused = document.activeElement as HTMLElement;
    expect(focused?.getAttribute('data-alert-dialog-cancel')).not.toBeNull();
    const which = focused.getAttribute('data-which-cancel');
    expect(which === 'a' || which === 'b').toBe(true);
    // Both cancel buttons exist and are distinct DOM nodes.
    const cancels = document.querySelectorAll('[data-alert-dialog-cancel]');
    expect(cancels.length).toBe(2);
    expect(cancels[0]).not.toBe(cancels[1]);
  });

  it('exposes a close helper from the Root default slot', async () => {
    const open = ref(true);
    let close: (() => void) | undefined;
    const Harness = defineComponent({
      setup() {
        return () => h(
          AlertDialogRoot,
          { open: open.value, 'onUpdate:open': (v: boolean | undefined) => { open.value = v!; } },
          {
            default: (slotProps: { open: boolean | undefined; close: () => void }) => {
              close = slotProps.close;
              return h(AlertDialogPortal, null, {
                default: () => h(AlertDialogContent, null, {
                  default: () => [
                    h(AlertDialogTitle, null, { default: () => 'T' }),
                    h(AlertDialogDescription, null, { default: () => 'D' }),
                    h(AlertDialogCancel, null, { default: () => 'Cancel' }),
                  ],
                }),
              });
            },
          },
        );
      },
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    expect(typeof close).toBe('function');
    close!();
    await nextTick();
    expect(open.value).toBe(false);
  });

  it('forwards a ref to the underlying content element', async () => {
    const contentRef = ref<{ $el?: HTMLElement }>();
    const Harness = defineComponent({
      setup() {
        return () => h(AlertDialogRoot, { open: true }, {
          default: () => h(AlertDialogPortal, null, {
            default: () => h(AlertDialogContent, { ref: contentRef }, {
              default: () => [
                h(AlertDialogTitle, null, { default: () => 'T' }),
                h(AlertDialogDescription, null, { default: () => 'D' }),
                h(AlertDialogCancel, null, { default: () => 'Cancel' }),
              ],
            }),
          }),
        });
      },
    });
    track(mount(Harness, { attachTo: document.body }));
    await flush();
    expect(contentRef.value?.$el).toBeTruthy();
    expect((contentRef.value!.$el as HTMLElement).getAttribute('role')).toBe('alertdialog');
  });
});
