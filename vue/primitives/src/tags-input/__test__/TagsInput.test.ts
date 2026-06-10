import {

  TagsInputClear,
  TagsInputInput,
  TagsInputItem,
  TagsInputItemDelete,
  TagsInputItemText,
  TagsInputRoot,
} from '../index';
import type { TagValue } from '../index';
import type { Component } from 'vue';
import { defineComponent, h, nextTick, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

function createTagsInput(rootProps: Record<string, unknown> = {}) {
  return mount(
    defineComponent({
      setup() {
        const tags = ref<string[]>(
          (rootProps.modelValue as string[] | undefined) ?? (rootProps.defaultValue as string[] | undefined) ?? [],
        );
        return () => h(
          TagsInputRoot,
          {
            modelValue: tags.value,
            'onUpdate:modelValue': (v: TagValue[]) => (tags.value = v as string[]),
            ...rootProps,
          },
          {
            default: ({ modelValue }: { modelValue: string[] }) => [
              ...modelValue.map(tag =>
                h(TagsInputItem, { key: tag, value: tag }, {
                  default: () => [
                    h(TagsInputItemText, null, { default: () => tag }),
                    h(TagsInputItemDelete, null, { default: () => '×' }),
                  ],
                }),
              ),
              h(TagsInputInput, { placeholder: 'add tag' }),
              h(TagsInputClear, null, { default: () => 'Clear' }),
            ],
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

describe('TagsInput', () => {
  it('renders initial tags from defaultValue', () => {
    const w = createTagsInput({ defaultValue: ['a', 'b'] });
    expect(w.findAllComponents(TagsInputItem as Component)).toHaveLength(2);
    w.unmount();
  });

  it('Enter adds a tag from input', async () => {
    const w = createTagsInput();
    const input = w.find('input');
    (input.element as HTMLInputElement).value = 'hello';
    await input.trigger('keydown', { key: 'Enter' });
    await nextTick();
    await nextTick();
    expect(w.findAllComponents(TagsInputItem as Component)).toHaveLength(1);
    expect(w.findComponent(TagsInputItem as Component).text()).toContain('hello');
    expect((input.element as HTMLInputElement).value).toBe('');
    w.unmount();
  });

  it('delimiter commits a tag on input', async () => {
    const w = createTagsInput({ delimiter: ',' });
    const input = w.find('input');
    (input.element as HTMLInputElement).value = 'x,';
    await input.trigger('input', { data: ',' });
    await nextTick();
    expect(w.findAllComponents(TagsInputItem as Component)).toHaveLength(1);
    expect(w.findComponent(TagsInputItem as Component).text()).toContain('x');
    w.unmount();
  });

  it('rejects duplicates by default and emits invalid', async () => {
    const w = createTagsInput({ defaultValue: ['foo'] });
    const input = w.find('input');
    (input.element as HTMLInputElement).value = 'foo';
    await input.trigger('keydown', { key: 'Enter' });
    await nextTick();
    await nextTick();
    expect(w.findAllComponents(TagsInputItem as Component)).toHaveLength(1);
    expect(w.findComponent(TagsInputRoot as Component).emitted('invalid')).toBeTruthy();
    w.unmount();
  });

  it('duplicate: true allows duplicates', async () => {
    const w = createTagsInput({ defaultValue: ['foo'], duplicate: true });
    const input = w.find('input');
    (input.element as HTMLInputElement).value = 'foo';
    await input.trigger('keydown', { key: 'Enter' });
    await nextTick();
    await nextTick();
    expect(w.findAllComponents(TagsInputItem as Component)).toHaveLength(2);
    w.unmount();
  });

  it('max caps tag count and emits invalid', async () => {
    const w = createTagsInput({ defaultValue: ['a', 'b'], max: 2 });
    const input = w.find('input');
    (input.element as HTMLInputElement).value = 'c';
    await input.trigger('keydown', { key: 'Enter' });
    await nextTick();
    await nextTick();
    expect(w.findAllComponents(TagsInputItem as Component)).toHaveLength(2);
    expect(w.findComponent(TagsInputRoot as Component).emitted('invalid')).toBeTruthy();
    w.unmount();
  });

  it('delete trigger removes its tag', async () => {
    const w = createTagsInput({ defaultValue: ['a', 'b'] });
    const deleteBtn = w.findAll('button').find(b => b.text() === '×');
    await deleteBtn!.trigger('click');
    await nextTick();
    const items = w.findAllComponents(TagsInputItem as Component);
    expect(items).toHaveLength(1);
    expect(items[0]!.text()).toContain('b');
    w.unmount();
  });

  it('Clear removes all tags', async () => {
    const w = createTagsInput({ defaultValue: ['a', 'b', 'c'] });
    const clearBtn = w.findAll('button').find(b => b.text() === 'Clear')!;
    await clearBtn.trigger('click');
    await nextTick();
    expect(w.findAllComponents(TagsInputItem as Component)).toHaveLength(0);
    w.unmount();
  });

  it('Backspace on empty input selects last tag; second Backspace deletes it', async () => {
    const w = createTagsInput({ defaultValue: ['a', 'b'] });
    const input = w.find('input').element as HTMLInputElement;
    input.focus();
    press(input, 'Backspace');
    await nextTick();
    press(input, 'Backspace');
    await nextTick();
    const items = w.findAllComponents(TagsInputItem as Component);
    expect(items).toHaveLength(1);
    expect(items[0]!.text()).toContain('a');
    w.unmount();
  });

  it('addOnBlur commits pending value on blur', async () => {
    const w = createTagsInput({ addOnBlur: true });
    const input = w.find('input');
    (input.element as HTMLInputElement).value = 'done';
    await input.trigger('blur');
    await nextTick();
    expect(w.findAllComponents(TagsInputItem as Component)).toHaveLength(1);
    w.unmount();
  });

  it('disabled blocks adding tags', async () => {
    const w = createTagsInput({ disabled: true });
    const input = w.find('input');
    expect((input.element as HTMLInputElement).disabled).toBe(true);
    w.unmount();
  });

  it('tag item is labelled by its ItemText id', async () => {
    const w = createTagsInput({ defaultValue: ['a'] });
    // ItemText assigns the shared textId during its own setup, one tick after
    // the item's first render.
    await nextTick();
    const item = w.findComponent(TagsInputItem as Component).element as HTMLElement;
    const text = w.findComponent(TagsInputItemText as Component).element as HTMLElement;
    expect(text.id).toBeTruthy();
    expect(item.getAttribute('aria-labelledby')).toBe(text.id);
    w.unmount();
  });

  it('Enter with pending text prevents default synchronously (blocks implicit form submit)', () => {
    const w = createTagsInput();
    const input = w.find('input').element as HTMLInputElement;
    input.value = 'hello';
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    input.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    w.unmount();
  });

  it('Enter on an empty input leaves the default action alone', () => {
    const w = createTagsInput();
    const input = w.find('input').element as HTMLInputElement;
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    input.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    w.unmount();
  });

  // Mirrors demo.vue: Clear lives in a footer wrapper that is a deep
  // descendant of Root, not a direct slot child.
  it('Clear injects context when nested deeper inside Root (demo layout)', async () => {
    const w = mount(
      defineComponent({
        setup() {
          const tags = ref<string[]>(['a', 'b']);
          return () => h(
            TagsInputRoot,
            {
              modelValue: tags.value,
              'onUpdate:modelValue': (v: TagValue[]) => (tags.value = v as string[]),
            },
            {
              default: () => [
                h('div', [
                  ...tags.value.map(tag =>
                    h(TagsInputItem, { key: tag, value: tag }, {
                      default: () => [h(TagsInputItemText, null, { default: () => tag })],
                    }),
                  ),
                  h(TagsInputInput),
                ]),
                h('div', [h(TagsInputClear, null, { default: () => 'Clear all' })]),
              ],
            },
          );
        },
      }),
      { attachTo: document.body },
    );
    const clearBtn = w.findAll('button').find(b => b.text() === 'Clear all')!;
    await clearBtn.trigger('click');
    await nextTick();
    expect(w.findAllComponents(TagsInputItem as Component)).toHaveLength(0);
    w.unmount();
  });
});
