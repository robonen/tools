import {
  ListboxContent,
  ListboxFilter,
  ListboxGroup,
  ListboxGroupLabel,
  ListboxItem,
  ListboxItemIndicator,
  ListboxRoot,

} from '../index';
import type { ListboxValue } from '../index';
import { defineComponent, h, nextTick, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

function createListbox(
  rootProps: Record<string, unknown> = {},
  options: string[] = ['Apple', 'Banana', 'Cherry'],
) {
  return mount(
    defineComponent({
      setup() {
        const value = ref(rootProps.modelValue ?? rootProps.defaultValue);
        return () => h(
          ListboxRoot,
          {
            modelValue: value.value as ListboxValue | ListboxValue[] | undefined,
            'onUpdate:modelValue': (v: unknown) => (value.value = v),
            ...rootProps,
          },
          {
            default: () => h(ListboxContent, null, {
              default: () => options.map(opt =>
                h(ListboxItem, { key: opt, value: opt }, {
                  default: () => [
                    opt,
                    h(ListboxItemIndicator, null, { default: () => '✓' }),
                  ],
                }),
              ),
            }),
          },
        );
      },
    }),
    { attachTo: document.body },
  );
}

function press(el: Element, key: string, init: KeyboardEventInit = {}) {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
}

describe('Listbox', () => {
  it('renders role=listbox with options', () => {
    const w = createListbox();
    const list = w.find('[role="listbox"]');
    expect(list.exists()).toBe(true);
    expect(w.findAll('[role="option"]')).toHaveLength(3);
    w.unmount();
  });

  it('click selects an item (single)', async () => {
    const w = createListbox();
    const items = w.findAll('[role="option"]');
    await items[1]!.trigger('click');
    await nextTick();
    expect(items[1]!.attributes('aria-selected')).toBe('true');
    expect(items[1]!.attributes('data-state')).toBe('checked');
    w.unmount();
  });

  it('toggle deselects on second click in single mode', async () => {
    const w = createListbox();
    const items = w.findAll('[role="option"]');
    await items[0]!.trigger('click');
    await items[0]!.trigger('click');
    await nextTick();
    expect(items[0]!.attributes('data-state')).toBe('unchecked');
    w.unmount();
  });

  it('multiple selection accumulates toggles', async () => {
    const w = createListbox({ multiple: true });
    const items = w.findAll('[role="option"]');
    await items[0]!.trigger('click');
    await items[2]!.trigger('click');
    await nextTick();
    expect(items[0]!.attributes('data-state')).toBe('checked');
    expect(items[2]!.attributes('data-state')).toBe('checked');
    expect(items[1]!.attributes('data-state')).toBe('unchecked');
    w.unmount();
  });

  it('multiple selectionBehavior=replace keeps a single value in the array', async () => {
    const w = createListbox({ multiple: true, selectionBehavior: 'replace' });
    const items = w.findAll('[role="option"]');
    await items[0]!.trigger('click');
    await items[1]!.trigger('click');
    await nextTick();
    expect(items[0]!.attributes('data-state')).toBe('unchecked');
    expect(items[1]!.attributes('data-state')).toBe('checked');
    w.unmount();
  });

  it('ArrowDown on listbox highlights next enabled item', async () => {
    const w = createListbox();
    const list = w.find('[role="listbox"]').element as HTMLElement;
    list.focus();
    // entry focus highlights first item
    await nextTick();
    press(list, 'ArrowDown');
    await nextTick();
    const items = w.findAll('[role="option"]');
    expect(items[1]!.attributes('data-highlighted')).toBe('');
    w.unmount();
  });

  it('Home/End jump to first/last item', async () => {
    const w = createListbox();
    const list = w.find('[role="listbox"]').element as HTMLElement;
    list.focus();
    await nextTick();
    press(list, 'End');
    await nextTick();
    const items = w.findAll('[role="option"]');
    expect(items[2]!.attributes('data-highlighted')).toBe('');
    press(list, 'Home');
    await nextTick();
    expect(items[0]!.attributes('data-highlighted')).toBe('');
    w.unmount();
  });

  it('Enter activates the highlighted item', async () => {
    const w = createListbox();
    const list = w.find('[role="listbox"]').element as HTMLElement;
    list.focus();
    await nextTick();
    press(list, 'End');
    await nextTick();
    press(list, 'Enter');
    await nextTick();
    const items = w.findAll('[role="option"]');
    expect(items[2]!.attributes('data-state')).toBe('checked');
    w.unmount();
  });

  it('typeahead jumps to first matching item by letter', async () => {
    const w = createListbox();
    const list = w.find('[role="listbox"]').element as HTMLElement;
    list.focus();
    await nextTick();
    press(list, 'c');
    await nextTick();
    const items = w.findAll('[role="option"]');
    expect(items[2]!.attributes('data-highlighted')).toBe('');
    w.unmount();
  });

  it('ItemIndicator renders only for selected items', async () => {
    const w = createListbox({ defaultValue: 'Banana' });
    await nextTick();
    const items = w.findAll('[role="option"]');
    expect(items[0]!.text()).not.toContain('✓');
    expect(items[1]!.text()).toContain('✓');
    w.unmount();
  });

  it('disabled root prevents selection', async () => {
    const w = createListbox({ disabled: true });
    const items = w.findAll('[role="option"]');
    await items[0]!.trigger('click');
    await nextTick();
    expect(items[0]!.attributes('data-state')).toBe('unchecked');
    w.unmount();
  });

  it('group exposes role=group with aria-labelledby', () => {
    const w = mount(
      defineComponent({
        setup: () => () =>
          h(ListboxRoot, null, {
            default: () => h(ListboxContent, null, {
              default: () => h(ListboxGroup, null, {
                default: () => [
                  h(ListboxGroupLabel, null, { default: () => 'Fruits' }),
                  h(ListboxItem, { value: 'x' }, { default: () => 'x' }),
                ],
              }),
            }),
          }),
      }),
      { attachTo: document.body },
    );
    const g = w.find('[role="group"]');
    expect(g.exists()).toBe(true);
    const labelledBy = g.attributes('aria-labelledby')!;
    expect(w.find(`#${labelledBy}`).text()).toBe('Fruits');
    w.unmount();
  });

  it('filter disables intrinsic focusability and mirrors highlight via aria-activedescendant', async () => {
    const w = mount(
      defineComponent({
        setup() {
          const q = ref('');
          return () => h(ListboxRoot, null, {
            default: () => [
              h(ListboxFilter, {
                modelValue: q.value,
                'onUpdate:modelValue': (v: string) => (q.value = v),
              }),
              h(ListboxContent, null, {
                default: () => ['a', 'b'].map(v =>
                  h(ListboxItem, { key: v, value: v }, { default: () => v }),
                ),
              }),
            ],
          });
        },
      }),
      { attachTo: document.body },
    );
    const input = w.find('input').element as HTMLInputElement;
    input.focus();
    press(input, 'ArrowDown');
    await nextTick();
    const firstItem = w.findAll('[role="option"]')[0]!;
    expect(input.getAttribute('aria-activedescendant')).toBe(firstItem.attributes('id'));
    w.unmount();
  });

  it('PageUp/PageDown jump to first/last item', async () => {
    const w = createListbox();
    const list = w.find('[role="listbox"]').element as HTMLElement;
    list.focus();
    await nextTick();
    press(list, 'PageDown');
    await nextTick();
    const items = w.findAll('[role="option"]');
    expect(items[2]!.attributes('data-highlighted')).toBe('');
    press(list, 'PageUp');
    await nextTick();
    expect(items[0]!.attributes('data-highlighted')).toBe('');
    w.unmount();
  });

  it('Ctrl+A selects all in multiple mode', async () => {
    const w = createListbox({ multiple: true });
    const list = w.find('[role="listbox"]').element as HTMLElement;
    list.focus();
    await nextTick();
    press(list, 'a', { ctrlKey: true });
    await nextTick();
    const items = w.findAll('[role="option"]');
    expect(items[0]!.attributes('data-state')).toBe('checked');
    expect(items[1]!.attributes('data-state')).toBe('checked');
    expect(items[2]!.attributes('data-state')).toBe('checked');
    w.unmount();
  });

  it('Shift+ArrowDown selects a contiguous range (multiple + replace)', async () => {
    const w = createListbox(
      { multiple: true, selectionBehavior: 'replace' },
      ['A', 'B', 'C', 'D'],
    );
    const items = w.findAll('[role="option"]');
    // Click sets the range anchor.
    await items[0]!.trigger('click');
    await nextTick();
    const list = w.find('[role="listbox"]').element as HTMLElement;
    press(list, 'ArrowDown', { shiftKey: true });
    await nextTick();
    expect(items[0]!.attributes('data-state')).toBe('checked');
    expect(items[1]!.attributes('data-state')).toBe('checked');
    expect(items[2]!.attributes('data-state')).toBe('unchecked');
    w.unmount();
  });

  it('Shift+End selects a range to the last item (multiple + replace)', async () => {
    const w = createListbox(
      { multiple: true, selectionBehavior: 'replace' },
      ['A', 'B', 'C', 'D'],
    );
    const items = w.findAll('[role="option"]');
    await items[1]!.trigger('click');
    await nextTick();
    const list = w.find('[role="listbox"]').element as HTMLElement;
    press(list, 'End', { shiftKey: true });
    await nextTick();
    expect(items[0]!.attributes('data-state')).toBe('unchecked');
    expect(items[1]!.attributes('data-state')).toBe('checked');
    expect(items[2]!.attributes('data-state')).toBe('checked');
    expect(items[3]!.attributes('data-state')).toBe('checked');
    w.unmount();
  });

  it('buffered multi-character typeahead matches by prefix', async () => {
    const w = createListbox({}, ['Apricot', 'Apple', 'Avocado']);
    const list = w.find('[role="listbox"]').element as HTMLElement;
    list.focus();
    await nextTick();
    press(list, 'a');
    press(list, 'p');
    press(list, 'p');
    await nextTick();
    const items = w.findAll('[role="option"]');
    // "app" should land on "Apple", not "Apricot".
    expect(items[1]!.attributes('data-highlighted')).toBe('');
    w.unmount();
  });

  it('typeahead honours the textValue override', async () => {
    const w = mount(
      defineComponent({
        setup: () => () =>
          h(ListboxRoot, null, {
            default: () => h(ListboxContent, null, {
              default: () => [
                h(ListboxItem, { value: 'a', textValue: 'Zebra' }, { default: () => '🦓 Animal' }),
                h(ListboxItem, { value: 'b', textValue: 'Apple' }, { default: () => '🍎 Fruit' }),
              ],
            }),
          }),
      }),
      { attachTo: document.body },
    );
    const list = w.find('[role="listbox"]').element as HTMLElement;
    list.focus();
    await nextTick();
    press(list, 'z');
    await nextTick();
    const items = w.findAll('[role="option"]');
    expect(items[0]!.attributes('data-highlighted')).toBe('');
    w.unmount();
  });

  it('selects structurally-equal object values without `by`', async () => {
    const options = [{ id: 1, label: 'One' }, { id: 2, label: 'Two' }];
    const w = mount(
      defineComponent({
        setup: () => () =>
          h(ListboxRoot, { defaultValue: { id: 2, label: 'Two' } }, {
            default: () => h(ListboxContent, null, {
              default: () => options.map(o =>
                h(ListboxItem, { key: o.id, value: o }, { default: () => o.label }),
              ),
            }),
          }),
      }),
      { attachTo: document.body },
    );
    await nextTick();
    const items = w.findAll('[role="option"]');
    // A different object instance with the same shape is still recognised.
    expect(items[1]!.attributes('data-state')).toBe('checked');
    expect(items[0]!.attributes('data-state')).toBe('unchecked');
    w.unmount();
  });

  it('renders a hidden form input mirroring the value when name is set', async () => {
    const w = createListbox({ name: 'fruit', defaultValue: 'Banana' });
    await nextTick();
    const hidden = w.find('input[name="fruit"]');
    expect(hidden.exists()).toBe(true);
    expect((hidden.element as HTMLInputElement).value).toBe('Banana');
    w.unmount();
  });

  it('does not render a hidden input without a name', () => {
    const w = createListbox({ defaultValue: 'Banana' });
    expect(w.find('input').exists()).toBe(false);
    w.unmount();
  });

  it('exposes an imperative API on the root', async () => {
    const rootRef = ref<{ highlightItem: (v: ListboxValue) => void; getItems: () => unknown[]; highlightedElement: unknown } | null>(null);
    const w = mount(
      defineComponent({
        setup: () => () =>
          h(ListboxRoot, { ref: rootRef }, {
            default: () => h(ListboxContent, null, {
              default: () => ['Apple', 'Banana', 'Cherry'].map(o =>
                h(ListboxItem, { key: o, value: o }, { default: () => o }),
              ),
            }),
          }),
      }),
      { attachTo: document.body },
    );
    await nextTick();
    expect(typeof rootRef.value!.highlightItem).toBe('function');
    expect(rootRef.value!.getItems().length).toBe(3);
    rootRef.value!.highlightItem('Cherry');
    await nextTick();
    const items = w.findAll('[role="option"]');
    expect(items[2]!.attributes('data-highlighted')).toBe('');
    w.unmount();
  });

  it('Enter mid IME composition does not commit a selection', async () => {
    const w = createListbox();
    const list = w.find('[role="listbox"]').element as HTMLElement;
    list.focus();
    await nextTick();
    press(list, 'End');
    await nextTick();
    list.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    press(list, 'Enter');
    await nextTick();
    const items = w.findAll('[role="option"]');
    expect(items[2]!.attributes('data-state')).toBe('unchecked');
    // After composition ends, Enter commits again.
    list.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    await nextTick();
    press(list, 'Enter');
    await nextTick();
    expect(items[2]!.attributes('data-state')).toBe('checked');
    w.unmount();
  });
});
