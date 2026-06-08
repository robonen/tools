import {
  EditableArea,
  EditableCancelTrigger,
  EditableEditTrigger,
  EditableInput,
  EditablePreview,
  EditableRoot,
  EditableSubmitTrigger,
} from '../index';
import { defineComponent, h, nextTick, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

function createEditable(rootProps: Record<string, unknown> = {}) {
  return mount(
    defineComponent({
      setup() {
        return () => h(
          EditableRoot,
          rootProps,
          {
            default: () => h(EditableArea, null, {
              default: () => [
                h(EditablePreview),
                h(EditableInput),
                h(EditableEditTrigger),
                h(EditableSubmitTrigger),
                h(EditableCancelTrigger),
              ],
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

describe('Editable', () => {
  it('renders preview with default placeholder when empty', () => {
    const w = createEditable({ placeholder: 'Click to edit' });
    const preview = w.find('span');
    expect(preview.text()).toBe('Click to edit');
    expect(preview.attributes('data-placeholder-shown')).toBe('');
    w.unmount();
  });

  it('renders model value in preview', () => {
    const w = createEditable({ modelValue: 'Hello' });
    expect(w.find('span').text()).toBe('Hello');
    w.unmount();
  });

  it('focus activation enters edit mode', async () => {
    const w = createEditable({ defaultValue: 'X', activationMode: 'focus' });
    await w.find('span').trigger('focusin');
    await nextTick();
    const input = w.find('input').element as HTMLInputElement;
    expect(input.hidden).toBe(false);
    expect((w.find('span').element as HTMLElement).hidden).toBe(true);
    w.unmount();
  });

  it('dblclick activation enters edit mode only on dblclick', async () => {
    const w = createEditable({ activationMode: 'dblclick' });
    await w.find('span').trigger('focusin');
    await nextTick();
    expect((w.find('input').element as HTMLInputElement).hidden).toBe(true);
    await w.find('span').trigger('dblclick');
    await nextTick();
    expect((w.find('input').element as HTMLInputElement).hidden).toBe(false);
    w.unmount();
  });

  it('edit trigger switches to edit mode', async () => {
    const w = createEditable({ activationMode: 'none' });
    const buttons = w.findAll('button');
    const editBtn = buttons.find(b => b.attributes('aria-label') === 'edit')!;
    await editBtn.trigger('click');
    await nextTick();
    expect((w.find('input').element as HTMLInputElement).hidden).toBe(false);
    w.unmount();
  });

  it('Enter submits when submitMode includes enter', async () => {
    const value = ref('initial');
    const w = mount(
      defineComponent({
        setup() {
          return () => h(
            EditableRoot,
            {
              modelValue: value.value,
              submitMode: 'enter',
              startWithEditMode: true,
              'onUpdate:modelValue': (v: string) => (value.value = v),
            },
            {
              default: () => h(EditableArea, null, {
                default: () => [h(EditablePreview), h(EditableInput)],
              }),
            },
          );
        },
      }),
      { attachTo: document.body },
    );
    await nextTick();
    const input = w.find('input');
    (input.element as HTMLInputElement).value = 'changed';
    await input.trigger('input');
    press(input.element, 'Enter');
    await nextTick();
    expect(value.value).toBe('changed');
    w.unmount();
  });

  it('Escape cancels and restores model value', async () => {
    const w = createEditable({ defaultValue: 'orig', submitMode: 'enter' });
    const editBtn = w.findAll('button').find(b => b.attributes('aria-label') === 'edit')!;
    await editBtn.trigger('click');
    await nextTick();
    const input = w.find('input');
    (input.element as HTMLInputElement).value = 'new';
    await input.trigger('input');
    press(input.element, 'Escape');
    await nextTick();
    expect(w.find('span').text()).toBe('orig');
    w.unmount();
  });

  it('submit trigger emits submit', async () => {
    const w = createEditable({ defaultValue: 'v1', startWithEditMode: true });
    await nextTick();
    const input = w.find('input');
    (input.element as HTMLInputElement).value = 'v2';
    await input.trigger('input');
    const submitBtn = w.findAll('button').find(b => b.attributes('aria-label') === 'submit')!;
    await submitBtn.trigger('click');
    await nextTick();
    const root = w.findComponent(EditableRoot);
    expect(root.emitted('update:modelValue')?.at(-1)).toEqual(['v2']);
    expect(root.emitted('submit')?.at(-1)).toEqual(['v2']);
    w.unmount();
  });

  it('cancel trigger reverts draft', async () => {
    const w = createEditable({ defaultValue: 'v1', startWithEditMode: true });
    await nextTick();
    const input = w.find('input');
    (input.element as HTMLInputElement).value = 'draft';
    await input.trigger('input');
    const cancelBtn = w.findAll('button').find(b => b.attributes('aria-label') === 'cancel')!;
    await cancelBtn.trigger('click');
    await nextTick();
    expect(w.find('span').text()).toBe('v1');
    expect(w.findComponent(EditableRoot).emitted('update:modelValue')).toBeUndefined();
    w.unmount();
  });

  it('disabled blocks edit activation', async () => {
    const w = createEditable({ defaultValue: 'v', disabled: true });
    await w.find('span').trigger('focusin');
    await nextTick();
    expect((w.find('input').element as HTMLInputElement).hidden).toBe(true);
    w.unmount();
  });
});
