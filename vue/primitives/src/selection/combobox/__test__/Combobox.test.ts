import type { Ref } from 'vue';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { defineComponent, h, nextTick, ref } from 'vue';

import {
  ComboboxAnchor,
  ComboboxCancel,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxTrigger,
  ComboboxViewport,
} from '../index';

interface MountOptions {
  defaultOpen?: boolean;
  model?: Ref<string | undefined>;
}

function mountCombobox(options: MountOptions = {}) {
  const Harness = defineComponent({
    setup: () => () => h(ComboboxRoot, {
      defaultOpen: options.defaultOpen ?? false,
      ...(options.model
        ? {
            modelValue: options.model.value,
            'onUpdate:modelValue': (v: unknown) => { options.model!.value = v as string | undefined; },
          }
        : {}),
    }, {
      default: () => [
        h(ComboboxAnchor, { id: 'anchor' }, {
          default: () => [
            h(ComboboxInput, { id: 'input' }),
            h(ComboboxCancel, { id: 'cancel' }, { default: () => 'x' }),
            h(ComboboxTrigger, { id: 'trigger' }, { default: () => 'v' }),
          ],
        }),
        h(ComboboxPortal, {}, {
          default: () => h(ComboboxContent, {}, {
            default: () => h(ComboboxViewport, {}, {
              default: () => [
                h(ComboboxItem, { value: 'apple', textValue: 'Apple' }, { default: () => 'Apple' }),
                h(ComboboxItem, { value: 'banana', textValue: 'Banana' }, { default: () => 'Banana' }),
                h(ComboboxItem, { value: 'cherry', textValue: 'Cherry' }, { default: () => 'Cherry' }),
              ],
            }),
          }),
        }),
      ],
    }),
  });
  return mount(Harness, { attachTo: document.body });
}

function getListbox(): HTMLElement | null {
  return document.querySelector('[data-primitives-combobox-content]');
}

function getInput(): HTMLInputElement {
  return document.querySelector<HTMLInputElement>('#input')!;
}

function visibleItemTexts(): string[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-primitives-combobox-item]'))
    .filter(el => el.style.display !== 'none')
    .map(el => el.textContent?.trim() ?? '');
}

async function flush(times = 3) {
  for (let i = 0; i < times; i++) await nextTick();
}

describe('Combobox — open / dismiss / filtering', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('stays open and focuses the input after clicking the trigger', async () => {
    const w = mountCombobox();
    await nextTick();

    await userEvent.click(document.querySelector('#trigger')!);
    await flush();

    // The popup must survive the input auto-focus (focus lands in the anchor,
    // outside the content layer) instead of dismissing itself immediately.
    expect(getListbox()).toBeTruthy();
    expect(document.activeElement).toBe(getInput());
    w.unmount();
  });

  it('keeps the popup open and clears the search when the cancel button is clicked', async () => {
    const w = mountCombobox();
    await nextTick();
    const input = getInput();

    await userEvent.click(input);
    await userEvent.type(input, 'ban');
    await flush();
    expect(getListbox()).toBeTruthy();
    expect(visibleItemTexts()).toEqual(['Banana']);

    await userEvent.click(document.querySelector('#cancel')!);
    await flush();

    expect(getListbox()).toBeTruthy();
    expect(input.value).toBe('');
    expect(visibleItemTexts()).toEqual(['Apple', 'Banana', 'Cherry']);
    w.unmount();
  });

  it('closes on outside pointerdown', async () => {
    const w = mountCombobox();
    await nextTick();

    await userEvent.click(document.querySelector('#trigger')!);
    await flush();
    expect(getListbox()).toBeTruthy();

    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    await flush();

    expect(getListbox()).toBeNull();
    w.unmount();
  });

  it('preserves the first keystroke when typing opens the combobox', async () => {
    const w = mountCombobox();
    await nextTick();
    const input = getInput();

    await userEvent.click(input);
    await userEvent.type(input, 'b');
    await flush();

    expect(getListbox()).toBeTruthy();
    expect(input.value).toBe('b');
    expect(visibleItemTexts()).toEqual(['Banana']);
    w.unmount();
  });

  it('lets Space type into a closed input instead of swallowing it', async () => {
    const w = mountCombobox();
    await nextTick();
    const input = getInput();

    await userEvent.click(input);
    await userEvent.type(input, ' ');
    await flush();

    expect(input.value).toBe(' ');
    // Typing (any printable character) still opens the list.
    expect(getListbox()).toBeTruthy();
    w.unmount();
  });

  it('does not open on caret keys (Home/End/PageDown) while closed', async () => {
    const w = mountCombobox();
    await nextTick();

    await userEvent.click(getInput());
    await userEvent.keyboard('{Home}{End}{PageDown}');
    await flush();

    expect(getListbox()).toBeNull();
    w.unmount();
  });

  it('opens on ArrowDown while closed', async () => {
    const w = mountCombobox();
    await nextTick();

    await userEvent.click(getInput());
    await userEvent.keyboard('{ArrowDown}');
    await flush();

    expect(getListbox()).toBeTruthy();
    w.unmount();
  });

  it('clears the selection when the parent clears v-model', async () => {
    const model = ref<string | undefined>(undefined);
    const w = mountCombobox({ model });
    await nextTick();

    await userEvent.click(document.querySelector('#trigger')!);
    await flush();
    const banana = Array.from(document.querySelectorAll<HTMLElement>('[data-primitives-combobox-item]'))
      .find(el => el.textContent?.includes('Banana'))!;
    await userEvent.click(banana);
    await flush();
    // Let the close-path setTimeout(1) reset isUserInputted before asserting.
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(model.value).toBe('banana');
    expect(getInput().value).toBe('banana');

    model.value = undefined;
    await flush();

    expect(getInput().value).toBe('');

    await userEvent.click(document.querySelector('#trigger')!);
    await flush();
    const bananaReopened = Array.from(document.querySelectorAll<HTMLElement>('[data-primitives-combobox-item]'))
      .find(el => el.textContent?.includes('Banana'))!;
    expect(bananaReopened.getAttribute('aria-selected')).toBe('false');
    w.unmount();
  });

  it('does not warn "expose() should be called only once" when mounting items', async () => {
    const warn = vi.spyOn(console, 'warn');
    const w = mountCombobox({ defaultOpen: true });
    await flush();

    const exposeWarnings = warn.mock.calls.filter(args =>
      args.some(arg => typeof arg === 'string' && arg.includes('expose() should be called only once')),
    );
    expect(exposeWarnings).toEqual([]);
    w.unmount();
    warn.mockRestore();
  });
});
