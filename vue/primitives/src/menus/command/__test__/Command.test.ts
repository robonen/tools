import { defineComponent, h, nextTick, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

import {
  CommandCancel,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandItemIndicator,
  CommandList,
  CommandRoot,
  CommandSeparator,
} from '../index';

interface Opt {
  value: string;
  label?: string;
  keywords?: string[];
  disabled?: boolean;
  textValue?: string;
}

function createCommand(
  options: Opt[],
  rootProps: Record<string, unknown> = {},
  inputProps: Record<string, unknown> = {},
) {
  return mount(
    defineComponent({
      setup() {
        return () =>
          h(CommandRoot, { label: 'Test palette', ...rootProps }, {
            default: () => [
              h(CommandInput, { ...inputProps }),
              h(CommandList, null, {
                default: () => [
                  h(CommandEmpty, null, { default: () => 'No results' }),
                  ...options.map(o =>
                    h(
                      CommandItem,
                      {
                        value: o.value,
                        keywords: o.keywords,
                        disabled: o.disabled,
                        textValue: o.textValue,
                      },
                      {
                        default: () => [
                          o.label ?? o.value,
                          h(CommandItemIndicator, null, { default: () => 'X' }),
                        ],
                      },
                    ),
                  ),
                ],
              }),
            ],
          });
      },
    }),
    { attachTo: document.body },
  );
}

function press(el: Element, key: string, opts: Record<string, unknown> = {}) {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts }));
}

function setInput(el: HTMLInputElement, value: string) {
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

const sample: Opt[] = [
  { value: 'apple', keywords: ['fruit'] },
  { value: 'banana', keywords: ['fruit', 'yellow'] },
  { value: 'cherry', keywords: ['fruit', 'red'] },
];

describe('Command — ARIA skeleton', () => {
  it('renders combobox input, listbox and options with correct roles', async () => {
    const w = createCommand(sample);
    await nextTick();
    expect(w.find('[role="combobox"]').exists()).toBe(true);
    expect(w.find('[role="listbox"]').exists()).toBe(true);
    expect(w.findAll('[role="option"]')).toHaveLength(3);
    const input = w.find('[role="combobox"]');
    expect(input.attributes('aria-controls')).toBe(w.find('[role="listbox"]').attributes('id'));
    w.unmount();
  });

  it('exposes a polite live region announcing result count', async () => {
    const w = createCommand(sample);
    await nextTick();
    const status = w.find('[role="status"]');
    expect(status.exists()).toBe(true);
    expect(status.text()).toContain('3 results available.');
    w.unmount();
  });

  it('drives aria-activedescendant from the highlighted item', async () => {
    const w = createCommand(sample);
    await nextTick();
    const input = w.find('[role="combobox"]');
    const active = input.attributes('aria-activedescendant');
    expect(active).toBeTruthy();
    const highlighted = w.find('[data-highlighted]');
    expect(highlighted.attributes('id')).toBe(active);
    w.unmount();
  });
});

describe('Command — aria-selected semantics', () => {
  it('sets aria-selected from committed modelValue, not the highlight', async () => {
    const w = createCommand(sample, { modelValue: 'banana' });
    await nextTick();
    const options = w.findAll('[role="option"]');
    const selected = options.filter(o => o.attributes('aria-selected') === 'true');
    expect(selected).toHaveLength(1);
    expect(selected[0]!.attributes('data-value')).toBe('banana');
    w.unmount();
  });

  it('highlight is conveyed via data-highlighted, separate from aria-selected', async () => {
    const w = createCommand(sample);
    await nextTick();
    // First item auto-highlighted, but nothing committed → no aria-selected.
    expect(w.findAll('[aria-selected="true"]')).toHaveLength(0);
    expect(w.findAll('[data-highlighted]')).toHaveLength(1);
    w.unmount();
  });

  it('renders ItemIndicator only on the committed item', async () => {
    const w = createCommand(sample, { modelValue: 'cherry' });
    await nextTick();
    const indicators = w.findAll('[data-primitives-command-item-indicator]');
    expect(indicators).toHaveLength(1);
    const cherryRow = w.findAll('[role="option"]').find(o => o.attributes('data-value') === 'cherry')!;
    expect(cherryRow.find('[data-primitives-command-item-indicator]').exists()).toBe(true);
    w.unmount();
  });
});

describe('Command — filtering', () => {
  it('filters by substring of value', async () => {
    const w = createCommand(sample);
    await nextTick();
    const input = w.find('[role="combobox"]').element as HTMLInputElement;
    setInput(input, 'ban');
    await nextTick();
    const visible = w.findAll('[role="option"]').filter(o => (o.element as HTMLElement).style.display !== 'none');
    expect(visible.map(o => o.attributes('data-value'))).toEqual(['banana']);
    w.unmount();
  });

  it('matches keywords', async () => {
    const w = createCommand(sample);
    await nextTick();
    const input = w.find('[role="combobox"]').element as HTMLInputElement;
    setInput(input, 'yellow');
    await nextTick();
    const visible = w.findAll('[role="option"]').filter(o => (o.element as HTMLElement).style.display !== 'none');
    expect(visible.map(o => o.attributes('data-value'))).toEqual(['banana']);
    w.unmount();
  });

  it('filters by textValue when the value is an opaque key', async () => {
    const w = createCommand([
      { value: 'id-1', textValue: 'Zebra' },
      { value: 'id-2', textValue: 'Lion' },
    ]);
    await nextTick();
    const input = w.find('[role="combobox"]').element as HTMLInputElement;
    setInput(input, 'zeb');
    await nextTick();
    const visible = w.findAll('[role="option"]').filter(o => (o.element as HTMLElement).style.display !== 'none');
    expect(visible.map(o => o.attributes('data-value'))).toEqual(['id-1']);
    w.unmount();
  });

  it('shows the empty state when nothing matches', async () => {
    const w = createCommand(sample);
    await nextTick();
    const input = w.find('[role="combobox"]').element as HTMLInputElement;
    setInput(input, 'zzzz');
    await nextTick();
    expect(w.find('[data-primitives-command-empty]').exists()).toBe(true);
    w.unmount();
  });

  it('respects shouldFilter=false (no filtering)', async () => {
    const w = createCommand(sample, { shouldFilter: false });
    await nextTick();
    const input = w.find('[role="combobox"]').element as HTMLInputElement;
    setInput(input, 'zzzz');
    await nextTick();
    const visible = w.findAll('[role="option"]').filter(o => (o.element as HTMLElement).style.display !== 'none');
    expect(visible).toHaveLength(3);
    w.unmount();
  });
});

describe('Command — keyboard navigation', () => {
  it('ArrowDown / ArrowUp move the highlight', async () => {
    const w = createCommand(sample);
    await nextTick();
    const input = w.find('[role="combobox"]');
    press(input.element, 'ArrowDown');
    await nextTick();
    expect(w.find('[data-highlighted]').attributes('data-value')).toBe('banana');
    press(input.element, 'ArrowUp');
    await nextTick();
    expect(w.find('[data-highlighted]').attributes('data-value')).toBe('apple');
    w.unmount();
  });

  it('Home / End jump to first / last', async () => {
    const w = createCommand(sample);
    await nextTick();
    const input = w.find('[role="combobox"]');
    press(input.element, 'End');
    await nextTick();
    expect(w.find('[data-highlighted]').attributes('data-value')).toBe('cherry');
    press(input.element, 'Home');
    await nextTick();
    expect(w.find('[data-highlighted]').attributes('data-value')).toBe('apple');
    w.unmount();
  });

  it('PageDown / PageUp jump to last / first', async () => {
    const w = createCommand(sample);
    await nextTick();
    const input = w.find('[role="combobox"]');
    press(input.element, 'PageDown');
    await nextTick();
    expect(w.find('[data-highlighted]').attributes('data-value')).toBe('cherry');
    press(input.element, 'PageUp');
    await nextTick();
    expect(w.find('[data-highlighted]').attributes('data-value')).toBe('apple');
    w.unmount();
  });

  it('clamps at the ends by default and wraps with loop', async () => {
    const clamp = createCommand(sample);
    await nextTick();
    let input = clamp.find('[role="combobox"]');
    press(input.element, 'ArrowUp');
    await nextTick();
    expect(clamp.find('[data-highlighted]').attributes('data-value')).toBe('apple');
    clamp.unmount();

    const loop = createCommand(sample, { loop: true });
    await nextTick();
    input = loop.find('[role="combobox"]');
    press(input.element, 'ArrowUp');
    await nextTick();
    expect(loop.find('[data-highlighted]').attributes('data-value')).toBe('cherry');
    loop.unmount();
  });

  it('Enter commits the highlighted item and updates modelValue', async () => {
    const model = ref<string | undefined>(undefined);
    const w = mount(
      defineComponent({
        setup() {
          return () =>
            h(CommandRoot, { modelValue: model.value, 'onUpdate:modelValue': (v: string | undefined) => (model.value = v) }, {
              default: () => [
                h(CommandInput),
                h(CommandList, null, {
                  default: () => sample.map(o => h(CommandItem, { value: o.value }, { default: () => o.value })),
                }),
              ],
            });
        },
      }),
      { attachTo: document.body },
    );
    await nextTick();
    const input = w.find('[role="combobox"]');
    press(input.element, 'ArrowDown');
    await nextTick();
    press(input.element, 'Enter');
    await nextTick();
    expect(model.value).toBe('banana');
    w.unmount();
  });

  it('Enter does NOT commit while IME composition is active', async () => {
    const model = ref<string | undefined>(undefined);
    const w = mount(
      defineComponent({
        setup() {
          return () =>
            h(CommandRoot, { modelValue: model.value, 'onUpdate:modelValue': (v: string | undefined) => (model.value = v) }, {
              default: () => [
                h(CommandInput),
                h(CommandList, null, {
                  default: () => sample.map(o => h(CommandItem, { value: o.value }, { default: () => o.value })),
                }),
              ],
            });
        },
      }),
      { attachTo: document.body },
    );
    await nextTick();
    const input = w.find('[role="combobox"]');
    press(input.element, 'Enter', { isComposing: true });
    await nextTick();
    expect(model.value).toBeUndefined();
    // Without composition it commits.
    press(input.element, 'Enter');
    await nextTick();
    expect(model.value).toBe('apple');
    w.unmount();
  });
});

describe('Command — selection & emit', () => {
  it('click commits and emits select on the item', async () => {
    const selected: string[] = [];
    const w = mount(
      defineComponent({
        setup() {
          return () =>
            h(CommandRoot, null, {
              default: () => [
                h(CommandInput),
                h(CommandList, null, {
                  default: () =>
                    sample.map(o =>
                      h(CommandItem, { value: o.value, onSelect: (v: string) => selected.push(v) }, { default: () => o.value }),
                    ),
                }),
              ],
            });
        },
      }),
      { attachTo: document.body },
    );
    await nextTick();
    const banana = w.findAll('[role="option"]').find(o => o.attributes('data-value') === 'banana')!;
    await banana.trigger('click');
    await nextTick();
    expect(selected).toEqual(['banana']);
    w.unmount();
  });

  it('disabled item blocks click selection and is skipped by keyboard', async () => {
    const selected: string[] = [];
    const opts: Opt[] = [
      { value: 'a' },
      { value: 'b', disabled: true },
      { value: 'c' },
    ];
    const w = mount(
      defineComponent({
        setup() {
          return () =>
            h(CommandRoot, null, {
              default: () => [
                h(CommandInput),
                h(CommandList, null, {
                  default: () =>
                    opts.map(o =>
                      h(
                        CommandItem,
                        { value: o.value, disabled: o.disabled, onSelect: (v: string) => selected.push(v) },
                        { default: () => o.value },
                      ),
                    ),
                }),
              ],
            });
        },
      }),
      { attachTo: document.body },
    );
    await nextTick();
    const disabled = w.findAll('[role="option"]').find(o => o.attributes('data-value') === 'b')!;
    expect(disabled.attributes('aria-disabled')).toBe('true');
    await disabled.trigger('click');
    await nextTick();
    expect(selected).toEqual([]);

    const input = w.find('[role="combobox"]');
    press(input.element, 'ArrowDown');
    await nextTick();
    // skips disabled 'b' → goes to 'c'
    expect(w.find('[data-highlighted]').attributes('data-value')).toBe('c');
    w.unmount();
  });
});

describe('Command — uncontrolled & controlled search', () => {
  it('uncontrolled defaultSearchTerm seeds the search', async () => {
    const w = createCommand(sample, { defaultSearchTerm: 'cher' });
    await nextTick();
    const visible = w.findAll('[role="option"]').filter(o => (o.element as HTMLElement).style.display !== 'none');
    expect(visible.map(o => o.attributes('data-value'))).toEqual(['cherry']);
    w.unmount();
  });

  it('controlled searchTerm v-model reflects into the list', async () => {
    const term = ref('app');
    const w = mount(
      defineComponent({
        setup() {
          return () =>
            h(CommandRoot, { searchTerm: term.value, 'onUpdate:searchTerm': (v: string) => (term.value = v) }, {
              default: () => [
                h(CommandInput),
                h(CommandList, null, {
                  default: () => sample.map(o => h(CommandItem, { value: o.value }, { default: () => o.value })),
                }),
              ],
            });
        },
      }),
      { attachTo: document.body },
    );
    await nextTick();
    let visible = w.findAll('[role="option"]').filter(o => (o.element as HTMLElement).style.display !== 'none');
    expect(visible.map(o => o.attributes('data-value'))).toEqual(['apple']);
    term.value = 'ban';
    await nextTick();
    visible = w.findAll('[role="option"]').filter(o => (o.element as HTMLElement).style.display !== 'none');
    expect(visible.map(o => o.attributes('data-value'))).toEqual(['banana']);
    w.unmount();
  });
});

describe('Command — Cancel / clear', () => {
  it('clears the search term and refocuses the input on click', async () => {
    const w = mount(
      defineComponent({
        setup() {
          return () =>
            h(CommandRoot, { defaultSearchTerm: 'banana' }, {
              default: () => [
                h(CommandInput),
                h(CommandCancel, null, { default: () => 'Clear' }),
                h(CommandList, null, {
                  default: () => sample.map(o => h(CommandItem, { value: o.value }, { default: () => o.value })),
                }),
              ],
            });
        },
      }),
      { attachTo: document.body },
    );
    await nextTick();
    const input = w.find('[role="combobox"]').element as HTMLInputElement;
    expect(input.value).toBe('banana');
    await w.find('[data-primitives-command-cancel]').trigger('click');
    await nextTick();
    expect(input.value).toBe('');
    expect(document.activeElement).toBe(input);
    w.unmount();
  });

  it('resetValue also clears the committed modelValue', async () => {
    const model = ref<string | undefined>('apple');
    const w = mount(
      defineComponent({
        setup() {
          return () =>
            h(CommandRoot, { modelValue: model.value, 'onUpdate:modelValue': (v: string | undefined) => (model.value = v) }, {
              default: () => [
                h(CommandInput),
                h(CommandCancel, { resetValue: true }, { default: () => 'Clear' }),
                h(CommandList, null, {
                  default: () => sample.map(o => h(CommandItem, { value: o.value }, { default: () => o.value })),
                }),
              ],
            });
        },
      }),
      { attachTo: document.body },
    );
    await nextTick();
    await w.find('[data-primitives-command-cancel]').trigger('click');
    await nextTick();
    expect(model.value).toBeUndefined();
    w.unmount();
  });

  it('renders a button with type=button and an accessible label', async () => {
    const w = mount(
      defineComponent({
        setup() {
          return () =>
            h(CommandRoot, null, {
              default: () => [h(CommandInput), h(CommandCancel, null, { default: () => 'Clear' })],
            });
        },
      }),
      { attachTo: document.body },
    );
    await nextTick();
    const btn = w.find('[data-primitives-command-cancel]');
    expect(btn.attributes('type')).toBe('button');
    expect(btn.attributes('aria-label')).toBe('Clear search');
    w.unmount();
  });
});

describe('Command — dir / RTL', () => {
  it('reflects dir on the root', async () => {
    const w = createCommand(sample, { dir: 'rtl' });
    await nextTick();
    expect(w.find('[data-primitives-command-root]').attributes('dir')).toBe('rtl');
    w.unmount();
  });

  it('defaults to ltr', async () => {
    const w = createCommand(sample);
    await nextTick();
    expect(w.find('[data-primitives-command-root]').attributes('dir')).toBe('ltr');
    w.unmount();
  });
});

describe('Command — separator', () => {
  it('hides the separator while a search term is active', async () => {
    const w = mount(
      defineComponent({
        setup() {
          return () =>
            h(CommandRoot, null, {
              default: () => [
                h(CommandInput),
                h(CommandList, null, {
                  default: () => [
                    h(CommandItem, { value: 'a' }, { default: () => 'a' }),
                    h(CommandSeparator),
                    h(CommandItem, { value: 'b' }, { default: () => 'b' }),
                  ],
                }),
              ],
            });
        },
      }),
      { attachTo: document.body },
    );
    await nextTick();
    expect(w.find('[data-primitives-command-separator]').exists()).toBe(true);
    const input = w.find('[role="combobox"]').element as HTMLInputElement;
    setInput(input, 'a');
    await nextTick();
    expect(w.find('[data-primitives-command-separator]').exists()).toBe(false);
    w.unmount();
  });
});

describe('Command — groups', () => {
  it('hides a group when all its items are filtered out', async () => {
    const w = mount(
      defineComponent({
        setup() {
          return () =>
            h(CommandRoot, null, {
              default: () => [
                h(CommandInput),
                h(CommandList, null, {
                  default: () => [
                    h(CommandGroup, { heading: 'Fruit', value: 'fruit' }, {
                      default: () => [
                        h(CommandItem, { value: 'apple' }, { default: () => 'apple' }),
                      ],
                    }),
                    h(CommandGroup, { heading: 'Veg', value: 'veg' }, {
                      default: () => [
                        h(CommandItem, { value: 'carrot' }, { default: () => 'carrot' }),
                      ],
                    }),
                  ],
                }),
              ],
            });
        },
      }),
      { attachTo: document.body },
    );
    await nextTick();
    const input = w.find('[role="combobox"]').element as HTMLInputElement;
    setInput(input, 'apple');
    await nextTick();
    const groups = w.findAll('[data-primitives-command-group]');
    const fruit = groups.find(g => g.text().includes('Fruit'))!;
    const veg = groups.find(g => g.text().includes('Veg'))!;
    expect(fruit.attributes('hidden')).toBeUndefined();
    expect(veg.attributes('hidden')).toBe('');
    w.unmount();
  });
});

describe('Command — edge cases', () => {
  it('handles an empty item list', async () => {
    const w = createCommand([]);
    await nextTick();
    expect(w.findAll('[role="option"]')).toHaveLength(0);
    const status = w.find('[role="status"]');
    expect(status.text()).toContain('0 results available.');
    w.unmount();
  });

  it('singular vs plural in the live region', async () => {
    const w = createCommand([{ value: 'only' }]);
    await nextTick();
    expect(w.find('[role="status"]').text()).toContain('1 result available.');
    w.unmount();
  });
});
