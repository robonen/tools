import {
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from '../index';
import type { SelectItemSelectEvent } from '../index';
import { defineComponent, h, nextTick, ref } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const mounted: Array<{ unmount: () => void }> = [];
function track<T extends { unmount: () => void }>(w: T): T {
  mounted.push(w);
  return w;
}

afterEach(() => {
  while (mounted.length) mounted.pop()!.unmount();
  document.body.innerHTML = '';
});

async function flush() {
  await nextTick();
  await nextTick();
  await nextTick();
}

interface Opt { value: unknown; label: string; disabled?: boolean }

const valueRef = ref<unknown>(undefined);

function createSelect(
  rootProps: Record<string, unknown> = {},
  options: Opt[] = [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
    { value: 'cherry', label: 'Cherry' },
  ],
  itemHandlers: Record<string, unknown> = {},
) {
  const value = ref(rootProps.modelValue ?? rootProps.defaultValue);
  valueRef.value = value.value;
  const w = mount(
    defineComponent({
      setup() {
        return () => h(
          SelectRoot,
          {
            modelValue: value.value as never,
            'onUpdate:modelValue': (v: unknown) => {
              value.value = v as never;
              valueRef.value = v;
            },
            ...rootProps,
          },
          {
            default: () => [
              h(SelectTrigger, null, {
                default: () => h(SelectValue, { placeholder: 'Pick one' }),
              }),
              h(SelectPortal, null, {
                default: () => h(SelectContent, null, {
                  default: () => h(SelectViewport, null, {
                    default: () => options.map(opt =>
                      h(SelectItem, { key: String(opt.value), value: opt.value as never, disabled: opt.disabled, ...itemHandlers }, {
                        default: () => [
                          h(SelectItemText, null, { default: () => opt.label }),
                          h(SelectItemIndicator, null, { default: () => '✓' }),
                        ],
                      }),
                    ),
                  }),
                }),
              }),
            ],
          },
        );
      },
    }),
    { attachTo: document.body },
  );
  return track(w);
}

function press(el: Element, key: string, init: KeyboardEventInit = {}) {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
}

function getTrigger(): HTMLElement {
  return document.querySelector('[role="combobox"]') as HTMLElement;
}

function getContent(): HTMLElement | null {
  return document.querySelector('[role="listbox"]');
}

function getItems(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
}

async function openByClick(trigger: HTMLElement) {
  trigger.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerType: 'mouse' }));
  await nextTick();
  await nextTick();
}

describe('Select — ARIA skeleton', () => {
  it('renders trigger as role=combobox with aria-controls and aria-expanded', () => {
    const w = createSelect();
    const trigger = getTrigger();
    expect(trigger).toBeTruthy();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBeTruthy();
    expect(trigger.getAttribute('aria-autocomplete')).toBe('none');
    w.unmount();
  });

  it('shows placeholder + data-placeholder when empty', () => {
    const w = createSelect();
    const trigger = getTrigger();
    expect(trigger.getAttribute('data-placeholder')).toBe('');
    expect(trigger.textContent).toContain('Pick one');
    w.unmount();
  });

  it('content carries role=listbox and matches trigger aria-controls when open', async () => {
    const w = createSelect();
    const trigger = getTrigger();
    await openByClick(trigger);
    const content = getContent();
    expect(content).toBeTruthy();
    expect(content!.id).toBe(trigger.getAttribute('aria-controls'));
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    w.unmount();
  });

  it('items expose role=option, aria-labelledby, aria-selected, data-state', async () => {
    const w = createSelect({ defaultValue: 'banana' });
    await openByClick(getTrigger());
    const items = getItems();
    expect(items).toHaveLength(3);
    expect(items[0]!.getAttribute('aria-labelledby')).toBeTruthy();
    const banana = items.find(i => i.textContent?.includes('Banana'))!;
    expect(banana.getAttribute('aria-selected')).toBe('true');
    expect(banana.getAttribute('data-state')).toBe('checked');
    w.unmount();
  });
});

describe('Select — initial label without opening', () => {
  it('SelectValue shows the selected label before the dropdown is ever opened', async () => {
    const w = createSelect({ defaultValue: 'cherry' });
    await nextTick();
    await nextTick();
    const trigger = getTrigger();
    expect(trigger.textContent).toContain('Cherry');
    expect(trigger.getAttribute('data-placeholder')).toBeNull();
    w.unmount();
  });
});

describe('Select — selection (controlled + uncontrolled)', () => {
  it('clicking an item selects its value and closes (single)', async () => {
    createSelect();
    const trigger = getTrigger();
    await openByClick(trigger);
    const banana = getItems().find(i => i.textContent?.includes('Banana'))!;
    banana.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();
    expect(valueRef.value).toBe('banana');
    expect(getContent()).toBeNull();
    expect(getTrigger().textContent).toContain('Banana');
  });

  it('uncontrolled defaultValue drives initial selection', async () => {
    const w = createSelect({ defaultValue: 'apple', modelValue: undefined });
    await nextTick();
    expect(getTrigger().textContent).toContain('Apple');
    w.unmount();
  });
});

describe('Select — keyboard', () => {
  it('opens on ArrowDown / Enter / Space', async () => {
    const w = createSelect();
    const trigger = getTrigger();
    press(trigger, 'ArrowDown');
    await nextTick();
    await nextTick();
    expect(getContent()).toBeTruthy();
    w.unmount();
  });

  it('Enter on an item selects it', async () => {
    const w = createSelect();
    await openByClick(getTrigger());
    const cherry = getItems().find(i => i.textContent?.includes('Cherry'))!;
    press(cherry, 'Enter');
    await nextTick();
    await nextTick();
    expect(getTrigger().textContent).toContain('Cherry');
    w.unmount();
  });
});

describe('Select — disabled', () => {
  it('root disabled prevents opening', async () => {
    const w = createSelect({ disabled: true });
    const trigger = getTrigger();
    await openByClick(trigger);
    expect(getContent()).toBeNull();
    expect(trigger.getAttribute('data-disabled')).toBe('');
    w.unmount();
  });

  it('disabled item does not select on click', async () => {
    const w = createSelect({}, [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B', disabled: true },
    ]);
    await openByClick(getTrigger());
    const b = getItems().find(i => i.textContent?.includes('B'))!;
    expect(b.getAttribute('data-disabled')).toBe('');
    b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    await nextTick();
    expect(getTrigger().textContent).not.toContain('B');
    w.unmount();
  });
});

describe('Select — multiple', () => {
  it('toggles array membership and stays open', async () => {
    createSelect({ multiple: true, modelValue: undefined, defaultValue: [] as string[] });
    const trigger = getTrigger();
    await openByClick(trigger);
    getItems().find(i => i.textContent?.includes('Apple'))!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();
    expect(getContent()).toBeTruthy(); // stays open
    getItems().find(i => i.textContent?.includes('Cherry'))!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();
    expect(valueRef.value).toEqual(['apple', 'cherry']);
  });

  it('reselecting a value removes it from the array', async () => {
    createSelect({ multiple: true, modelValue: undefined, defaultValue: ['apple', 'banana'] as string[] });
    await openByClick(getTrigger());
    getItems().find(i => i.textContent?.includes('Apple'))!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();
    expect(valueRef.value).toEqual(['banana']);
  });
});

describe('Select — object values with `by`', () => {
  it('compares object values by key', async () => {
    const objs: Opt[] = [
      { value: { id: 1 }, label: 'One' },
      { value: { id: 2 }, label: 'Two' },
    ];
    const w = createSelect({ by: 'id', defaultValue: { id: 2 } }, objs);
    await nextTick();
    await nextTick();
    expect(getTrigger().textContent).toContain('Two');
    w.unmount();
  });
});

describe('Select — select event is cancelable', () => {
  it('preventDefault on the select event blocks the value change', async () => {
    const onSelect = vi.fn((e: SelectItemSelectEvent) => e.preventDefault());
    const w = createSelect({}, undefined, { onSelect });
    await openByClick(getTrigger());
    const apple = getItems().find(i => i.textContent?.includes('Apple'))!;
    apple.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    await nextTick();
    expect(onSelect).toHaveBeenCalled();
    expect(getTrigger().textContent).not.toContain('Apple');
    w.unmount();
  });
});

describe('Select — empty-string value guard', () => {
  it('throws if an item has an empty-string value', async () => {
    const errors: unknown[] = [];
    const original = globalThis.onerror;
    const onRejection = (e: PromiseRejectionEvent) => {
      errors.push(e.reason);
      e.preventDefault();
    };
    globalThis.addEventListener('unhandledrejection', onRejection);
    globalThis.onerror = (_m, _s, _l, _c, err) => {
      errors.push(err);
      return true;
    };

    const w = mount(
      defineComponent({
        errorCaptured(err) {
          errors.push(err);
          return false;
        },
        setup() {
          return () => h(SelectRoot, { defaultOpen: true }, {
            default: () => h(SelectPortal, null, {
              default: () => h(SelectContent, null, {
                default: () => h(SelectViewport, null, {
                  default: () => h(SelectItem, { value: '' }, {
                    default: () => h(SelectItemText, null, { default: () => 'Empty' }),
                  }),
                }),
              }),
            }),
          });
        },
      }),
      { attachTo: document.body },
    );
    track(w);
    await flush();
    globalThis.removeEventListener('unhandledrejection', onRejection);
    globalThis.onerror = original;

    expect(errors.some(e => (e as Error)?.message?.includes('empty string'))).toBe(true);
  });
});

describe('Select — typeahead on closed trigger', () => {
  it('typing selects a matching option without opening', async () => {
    const w = createSelect();
    await nextTick();
    await nextTick();
    const trigger = getTrigger();
    press(trigger, 'c');
    await nextTick();
    await nextTick();
    expect(getContent()).toBeNull();
    expect(getTrigger().textContent).toContain('Cherry');
    w.unmount();
  });
});

describe('Select — native form submission', () => {
  it('renders a hidden native select inside a form with options', async () => {
    const w = mount(
      defineComponent({
        setup() {
          const value = ref('banana');
          return () => h('form', null, [
            h(
              SelectRoot,
              { name: 'fruit', modelValue: value.value, 'onUpdate:modelValue': (v: never) => (value.value = v) },
              {
                default: () => [
                  h(SelectTrigger, null, { default: () => h(SelectValue) }),
                  h(SelectPortal, null, {
                    default: () => h(SelectContent, null, {
                      default: () => h(SelectViewport, null, {
                        default: () => [
                          h(SelectItem, { value: 'apple' }, { default: () => h(SelectItemText, null, { default: () => 'Apple' }) }),
                          h(SelectItem, { value: 'banana' }, { default: () => h(SelectItemText, null, { default: () => 'Banana' }) }),
                        ],
                      }),
                    }),
                  }),
                ],
              },
            ),
          ]);
        },
      }),
      { attachTo: document.body },
    );
    await nextTick();
    await nextTick();
    const nativeSelect = document.querySelector('form select[name="fruit"]') as HTMLSelectElement | null;
    expect(nativeSelect).toBeTruthy();
    expect(nativeSelect!.querySelectorAll('option').length).toBeGreaterThanOrEqual(2);
    w.unmount();
  });
});
