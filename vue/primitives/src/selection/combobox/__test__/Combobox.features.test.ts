import type { Ref } from 'vue';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { defineComponent, h, nextTick, ref } from 'vue';

import {
  ComboboxAnchor,
  ComboboxCancel,
  ComboboxContent,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxTrigger,
  ComboboxViewport,
  accentInsensitiveContains,
} from '../index';

interface MountOptions {
  defaultOpen?: boolean;
  multiple?: boolean;
  highlightOnHover?: boolean;
  resetModelValueOnClear?: boolean;
  openOnFocus?: boolean;
  openOnClick?: boolean;
  model?: Ref<unknown>;
  onSelect?: (e: CustomEvent) => void;
  onHighlight?: (p: unknown) => void;
  items?: Array<{ value: string; textValue: string }>;
}

const DEFAULT_ITEMS = [
  { value: 'apple', textValue: 'Apple' },
  { value: 'banana', textValue: 'Banana' },
  { value: 'cherry', textValue: 'Cherry' },
];

function mountCombobox(options: MountOptions = {}) {
  const items = options.items ?? DEFAULT_ITEMS;
  const Harness = defineComponent({
    setup: () => () => h(ComboboxRoot, {
      defaultOpen: options.defaultOpen ?? false,
      multiple: options.multiple ?? false,
      ...(options.highlightOnHover !== undefined ? { highlightOnHover: options.highlightOnHover } : {}),
      ...(options.resetModelValueOnClear !== undefined ? { resetModelValueOnClear: options.resetModelValueOnClear } : {}),
      ...(options.openOnFocus !== undefined ? { openOnFocus: options.openOnFocus } : {}),
      ...(options.openOnClick !== undefined ? { openOnClick: options.openOnClick } : {}),
      ...(options.onHighlight ? { onHighlight: options.onHighlight } : {}),
      ...(options.model
        ? {
            modelValue: options.model.value,
            'onUpdate:modelValue': (v: unknown) => { options.model!.value = v; },
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
              default: () => items.map(it => h(ComboboxItem, {
                key: it.value,
                value: it.value,
                textValue: it.textValue,
                ...(options.onSelect ? { onSelect: options.onSelect } : {}),
              }, { default: () => it.textValue })),
            }),
          }),
        }),
      ],
    }),
  });
  return mount(Harness, { attachTo: document.body });
}

function getInput(): HTMLInputElement {
  return document.querySelector<HTMLInputElement>('#input')!;
}

function getItem(text: string): HTMLElement {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-primitives-combobox-item]'))
    .find(el => el.textContent?.includes(text))!;
}

function getContent(): HTMLElement | null {
  return document.querySelector('[data-primitives-combobox-content]');
}

async function flush(times = 4) {
  for (let i = 0; i < times; i++) await nextTick();
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Combobox — cancelable item select event', () => {
  it('fires select on click and commits when not prevented', async () => {
    const model = ref<unknown>(undefined);
    const onSelect = vi.fn();
    const w = mountCombobox({ defaultOpen: true, model, onSelect });
    await flush();

    await userEvent.click(getItem('Banana'));
    await flush();

    expect(onSelect).toHaveBeenCalledTimes(1);
    const event = onSelect.mock.calls[0]![0] as CustomEvent;
    expect(event.detail.value).toBe('banana');
    expect(model.value).toBe('banana');
    w.unmount();
  });

  it('blocks selection when the consumer calls preventDefault', async () => {
    const model = ref<unknown>(undefined);
    const onSelect = (e: CustomEvent) => e.preventDefault();
    const w = mountCombobox({ defaultOpen: true, model, onSelect });
    await flush();

    await userEvent.click(getItem('Banana'));
    await flush();

    expect(model.value).toBeUndefined();
    // List stays open because selection was blocked (single-select would close on commit).
    expect(getContent()).toBeTruthy();
    w.unmount();
  });

  it('fires the same cancelable select on keyboard Enter', async () => {
    const model = ref<unknown>(undefined);
    const onSelect = vi.fn((e: CustomEvent) => e.preventDefault());
    const w = mountCombobox({ model, onSelect });
    await flush();

    const input = getInput();
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowDown}');
    await flush();
    await userEvent.keyboard('{Enter}');
    await flush();

    expect(onSelect).toHaveBeenCalled();
    // preventDefault blocked the commit.
    expect(model.value).toBeUndefined();
    w.unmount();
  });
});

describe('Combobox — empty-string item value guard', () => {
  it('throws when an item has an empty-string value', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => mountCombobox({
      defaultOpen: true,
      items: [{ value: '', textValue: 'Empty' }],
    })).toThrow(/empty string/i);
    spy.mockRestore();
  });
});

describe('Combobox — resetModelValueOnClear', () => {
  it('clears the model value when Cancel is clicked and the prop is set', async () => {
    const model = ref<unknown>('banana');
    const w = mountCombobox({ defaultOpen: true, model, resetModelValueOnClear: true });
    await flush();

    await userEvent.click(document.querySelector('#cancel')!);
    await flush();

    expect(model.value).toBeUndefined();
    w.unmount();
  });

  it('leaves the model value intact by default', async () => {
    const model = ref<unknown>('banana');
    const w = mountCombobox({ defaultOpen: true, model });
    await flush();

    await userEvent.click(document.querySelector('#cancel')!);
    await flush();

    expect(model.value).toBe('banana');
    w.unmount();
  });

  it('resets to an empty array in multiple mode', async () => {
    const model = ref<unknown>(['banana']);
    const w = mountCombobox({ defaultOpen: true, multiple: true, model, resetModelValueOnClear: true });
    await flush();

    await userEvent.click(document.querySelector('#cancel')!);
    await flush();

    expect(model.value).toEqual([]);
    w.unmount();
  });
});

describe('Combobox — highlightOnHover opt-out', () => {
  it('does not highlight on pointermove when highlightOnHover is false', async () => {
    const w = mountCombobox({ defaultOpen: true, highlightOnHover: false });
    await flush();

    const cherry = getItem('Cherry');
    cherry.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
    await flush();

    expect(cherry.getAttribute('data-highlighted')).toBeNull();
    w.unmount();
  });

  it('highlights on pointermove by default', async () => {
    const w = mountCombobox({ defaultOpen: true });
    await flush();

    const cherry = getItem('Cherry');
    cherry.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
    await flush();

    expect(cherry.getAttribute('data-highlighted')).toBe('');
    w.unmount();
  });
});

describe('Combobox — highlight emit', () => {
  it('emits highlight with the active item when navigation moves', async () => {
    const onHighlight = vi.fn();
    const w = mountCombobox({ onHighlight });
    await flush();

    const input = getInput();
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowDown}');
    await flush();

    const lastPayload = onHighlight.mock.calls.at(-1)?.[0];
    expect(lastPayload).toBeTruthy();
    expect(lastPayload.value).toBe('apple');
    w.unmount();
  });

  it('emits highlight undefined when the list closes', async () => {
    const onHighlight = vi.fn();
    const w = mountCombobox({ defaultOpen: true, onHighlight });
    await flush();

    const cherry = getItem('Cherry');
    cherry.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
    await flush();
    onHighlight.mockClear();

    await userEvent.keyboard('{Escape}');
    await flush();

    expect(onHighlight).toHaveBeenCalledWith(undefined);
    w.unmount();
  });
});

describe('Combobox — accent-insensitive default filter', () => {
  it('matches accented text against an unaccented search term', () => {
    expect(accentInsensitiveContains('Café', 'cafe')).toBe(true);
    expect(accentInsensitiveContains('Crème brûlée', 'creme')).toBe(true);
    expect(accentInsensitiveContains('Apple', 'xyz')).toBe(false);
  });

  it('filters list items ignoring diacritics', async () => {
    const w = mountCombobox({
      items: [
        { value: 'cafe', textValue: 'Café' },
        { value: 'tea', textValue: 'Tea' },
      ],
    });
    await flush();

    const input = getInput();
    await userEvent.click(input);
    await userEvent.type(input, 'cafe');
    await flush();

    const visible = Array.from(document.querySelectorAll<HTMLElement>('[data-primitives-combobox-item]'))
      .filter(el => el.style.display !== 'none')
      .map(el => el.textContent?.trim());
    expect(visible).toEqual(['Café']);
    w.unmount();
  });
});

describe('Combobox — IME composition guard', () => {
  it('does not select an item when Enter fires during composition', async () => {
    const model = ref<unknown>(undefined);
    const w = mountCombobox({ model });
    await flush();

    const input = getInput();
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowDown}');
    await flush();

    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await flush();

    expect(model.value).toBeUndefined();

    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await flush();

    expect(model.value).toBe('apple');
    w.unmount();
  });
});

describe('Combobox — Root-level openOnFocus / openOnClick', () => {
  it('opens on input focus when Root openOnFocus is set', async () => {
    const w = mountCombobox({ openOnFocus: true });
    await flush();

    getInput().focus();
    await flush();

    expect(getContent()).toBeTruthy();
    w.unmount();
  });

  it('opens on input click when Root openOnClick is set', async () => {
    const w = mountCombobox({ openOnClick: true });
    await flush();

    await userEvent.click(getInput());
    await flush();

    expect(getContent()).toBeTruthy();
    w.unmount();
  });
});

describe('Combobox — group label relationship', () => {
  function mountWithGroup(withLabel: boolean) {
    const Harness = defineComponent({
      setup: () => () => h(ComboboxRoot, { defaultOpen: true }, {
        default: () => [
          h(ComboboxAnchor, {}, { default: () => h(ComboboxInput, { id: 'input' }) }),
          h(ComboboxPortal, {}, {
            default: () => h(ComboboxContent, {}, {
              default: () => h(ComboboxViewport, {}, {
                default: () => h(ComboboxGroup, { id: 'group' }, {
                  default: () => [
                    ...(withLabel ? [h(ComboboxLabel, { class: 'group-label' }, { default: () => 'Fruits' })] : []),
                    h(ComboboxItem, { value: 'apple', textValue: 'Apple' }, { default: () => 'Apple' }),
                  ],
                }),
              }),
            }),
          }),
        ],
      }),
    });
    return mount(Harness, { attachTo: document.body });
  }

  it('points aria-labelledby at the rendered label id', async () => {
    const w = mountWithGroup(true);
    await flush();

    const group = document.querySelector('#group')!;
    const label = document.querySelector('.group-label')!;
    const labelledby = group.getAttribute('aria-labelledby');
    expect(labelledby).toBeTruthy();
    expect(label.id).toBeTruthy();
    expect(labelledby).toBe(label.id);
    w.unmount();
  });

  it('omits aria-labelledby when no label is rendered (no dangling id)', async () => {
    const w = mountWithGroup(false);
    await flush();

    const group = document.querySelector('#group')!;
    expect(group.getAttribute('aria-labelledby')).toBeNull();
    w.unmount();
  });
});

describe('Combobox — hideWhenEmpty + data-empty', () => {
  function mountHideWhenEmpty() {
    const Harness = defineComponent({
      setup: () => () => h(ComboboxRoot, { defaultOpen: true }, {
        default: () => [
          h(ComboboxAnchor, {}, { default: () => h(ComboboxInput, { id: 'input' }) }),
          h(ComboboxPortal, {}, {
            default: () => h(ComboboxContent, { hideWhenEmpty: true }, {
              default: () => h(ComboboxViewport, {}, {
                default: () => DEFAULT_ITEMS.map(it => h(ComboboxItem, {
                  key: it.value,
                  value: it.value,
                  textValue: it.textValue,
                }, { default: () => it.textValue })),
              }),
            }),
          }),
        ],
      }),
    });
    return mount(Harness, { attachTo: document.body });
  }

  it('marks the content data-empty and hides it when no items match', async () => {
    const w = mountHideWhenEmpty();
    await flush();

    const content = getContent()!;
    expect(content.getAttribute('data-empty')).toBeNull();

    const input = getInput();
    await userEvent.click(input);
    await userEvent.type(input, 'zzz');
    await flush();

    expect(content.getAttribute('data-empty')).toBe('');
    expect(content.style.display).toBe('none');
    w.unmount();
  });
});
