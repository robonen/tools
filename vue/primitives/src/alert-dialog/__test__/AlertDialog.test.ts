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
});
