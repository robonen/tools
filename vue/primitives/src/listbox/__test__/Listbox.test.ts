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

function press(el: Element, key: string) {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
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
});
