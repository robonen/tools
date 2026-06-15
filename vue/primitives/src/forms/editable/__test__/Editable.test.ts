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

// EditableRoot defers its outside-blur decision by a macrotask.
function waitForBlurTimers() {
  return new Promise(resolve => setTimeout(resolve, 20));
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

  it('keeps edit mode when the focused edit trigger hides itself (real focus)', async () => {
    const w = createEditable({ defaultValue: 'v', activationMode: 'none' });
    const editBtn = w.findAll('button').find(b => b.attributes('aria-label') === 'edit')!;
    (editBtn.element as HTMLButtonElement).focus();
    (editBtn.element as HTMLButtonElement).click();
    await nextTick();
    await waitForBlurTimers();
    expect((w.find('input').element as HTMLInputElement).hidden).toBe(false);
    expect(document.activeElement).toBe(w.find('input').element);
    expect(w.findComponent(EditableRoot).emitted('update:state')?.flat()).toEqual(['edit']);
    w.unmount();
  });

  it('keeps edit mode when the really-focused preview hides itself (focus activation)', async () => {
    const w = createEditable({ defaultValue: 'v', activationMode: 'focus' });
    (w.find('span').element as HTMLElement).focus();
    await nextTick();
    await waitForBlurTimers();
    expect((w.find('input').element as HTMLInputElement).hidden).toBe(false);
    expect(document.activeElement).toBe(w.find('input').element);
    expect(w.findComponent(EditableRoot).emitted('update:state')?.flat()).toEqual(['edit']);
    w.unmount();
  });

  it('still submits when focus genuinely leaves the root (submitMode blur)', async () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    const w = createEditable({ defaultValue: 'v1', startWithEditMode: true, submitMode: 'blur' });
    await nextTick();
    const input = w.find('input');
    (input.element as HTMLInputElement).focus();
    (input.element as HTMLInputElement).value = 'v2';
    await input.trigger('input');
    outside.focus();
    await waitForBlurTimers();
    const root = w.findComponent(EditableRoot);
    expect(root.emitted('submit')?.at(-1)).toEqual(['v2']);
    expect((w.find('input').element as HTMLInputElement).hidden).toBe(true);
    outside.remove();
    w.unmount();
  });

  it('hides parts even when consumer display utility classes override [hidden]', async () => {
    const style = document.createElement('style');
    style.textContent = '.u-block { display: block; } .u-inline-flex { display: inline-flex; }';
    document.head.appendChild(style);
    const w = mount(
      defineComponent({
        setup() {
          return () => h(
            EditableRoot,
            { defaultValue: 'v', activationMode: 'none' },
            {
              default: () => h(EditableArea, null, {
                default: () => [
                  h(EditablePreview, { class: 'u-block' }),
                  h(EditableInput, { class: 'u-block' }),
                  h(EditableEditTrigger, { class: 'u-inline-flex' }),
                  h(EditableSubmitTrigger, { class: 'u-inline-flex' }),
                  h(EditableCancelTrigger, { class: 'u-inline-flex' }),
                ],
              }),
            },
          );
        },
      }),
      { attachTo: document.body },
    );
    const button = (label: string) =>
      w.findAll('button').find(b => b.attributes('aria-label') === label)!.element as HTMLElement;
    expect(getComputedStyle(w.find('input').element).display).toBe('none');
    expect(getComputedStyle(button('submit')).display).toBe('none');
    expect(getComputedStyle(button('cancel')).display).toBe('none');
    expect(getComputedStyle(button('edit')).display).toBe('inline-flex');
    await w.findAll('button').find(b => b.attributes('aria-label') === 'edit')!.trigger('click');
    await nextTick();
    expect(getComputedStyle(w.find('span').element).display).toBe('none');
    expect(getComputedStyle(button('edit')).display).toBe('none');
    expect(getComputedStyle(w.find('input').element).display).toBe('block');
    expect(getComputedStyle(button('submit')).display).toBe('inline-flex');
    expect(getComputedStyle(button('cancel')).display).toBe('inline-flex');
    style.remove();
    w.unmount();
  });

  it('submit and cancel triggers are no-ops while not editing', async () => {
    const w = createEditable({ defaultValue: 'v1' });
    const submitBtn = w.findAll('button').find(b => b.attributes('aria-label') === 'submit')!;
    const cancelBtn = w.findAll('button').find(b => b.attributes('aria-label') === 'cancel')!;
    await submitBtn.trigger('click');
    await cancelBtn.trigger('click');
    const root = w.findComponent(EditableRoot);
    expect(root.emitted('submit')).toBeUndefined();
    expect(root.emitted('update:state')).toBeUndefined();
    w.unmount();
  });

  it('threads id prop onto the input', () => {
    const w = createEditable({ id: 'my-field', defaultValue: 'v' });
    expect(w.find('input').attributes('id')).toBe('my-field');
    w.unmount();
  });

  it('binds resolved dir on the root', () => {
    const w = createEditable({ dir: 'rtl', defaultValue: 'v' });
    expect(w.findComponent(EditableRoot).element.getAttribute('dir')).toBe('rtl');
    w.unmount();
  });

  it('defaults dir to ltr when no override is provided', () => {
    const w = createEditable({ defaultValue: 'v' });
    expect(w.findComponent(EditableRoot).element.getAttribute('dir')).toBe('ltr');
    w.unmount();
  });

  it('exposes imperative edit/cancel/submit via a template ref', async () => {
    const exposedRef = ref<{ edit: () => void; cancel: () => void; submit: () => void } | null>(null);
    const w = mount(
      defineComponent({
        setup() {
          return () => h(
            EditableRoot,
            { ref: exposedRef as unknown as Record<string, unknown>, defaultValue: 'v' },
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
    expect(typeof exposedRef.value?.edit).toBe('function');
    expect(typeof exposedRef.value?.cancel).toBe('function');
    expect(typeof exposedRef.value?.submit).toBe('function');
    exposedRef.value!.edit();
    await nextTick();
    expect((w.find('input').element as HTMLInputElement).hidden).toBe(false);
    w.unmount();
  });

  it('sets aria-disabled on triggers when disabled', () => {
    const w = createEditable({ defaultValue: 'v', disabled: true });
    w.findAll('button').forEach((b) => {
      expect(b.attributes('aria-disabled')).toBe('true');
    });
    w.unmount();
  });

  it('omits aria-disabled on triggers when enabled', () => {
    const w = createEditable({ defaultValue: 'v' });
    w.findAll('button').forEach((b) => {
      expect(b.attributes('aria-disabled')).toBeUndefined();
    });
    w.unmount();
  });

  it('does not render a hidden form input without a surrounding form', () => {
    const w = createEditable({ defaultValue: 'v', name: 'field' });
    const inputs = w.findAll('input');
    // Only the EditableInput exists; no visually-hidden form input.
    expect(inputs.filter(i => i.attributes('name') === 'field')).toHaveLength(0);
    w.unmount();
  });

  it('renders a hidden form input mirroring the value inside a form', async () => {
    const w = mount(
      defineComponent({
        setup() {
          return () => h('form', null, [
            h(
              EditableRoot,
              { defaultValue: 'submitted-value', name: 'field' },
              {
                default: () => h(EditableArea, null, {
                  default: () => [h(EditablePreview), h(EditableInput)],
                }),
              },
            ),
          ]);
        },
      }),
      { attachTo: document.body },
    );
    await nextTick();
    const hidden = w.findAll('input').find(i => i.attributes('name') === 'field');
    expect(hidden).toBeTruthy();
    expect((hidden!.element as HTMLInputElement).value).toBe('submitted-value');
    w.unmount();
  });

  it('mirrors required onto the hidden form input', async () => {
    const w = mount(
      defineComponent({
        setup() {
          return () => h('form', null, [
            h(
              EditableRoot,
              { defaultValue: '', name: 'field', required: true },
              {
                default: () => h(EditableArea, null, {
                  default: () => [h(EditablePreview), h(EditableInput)],
                }),
              },
            ),
          ]);
        },
      }),
      { attachTo: document.body },
    );
    await nextTick();
    const hidden = w.findAll('input').find(i => i.attributes('name') === 'field');
    expect(hidden!.attributes('required')).toBeDefined();
    w.unmount();
  });

  it('commits on pointerdown outside the root (submitMode blur)', async () => {
    const outside = document.createElement('div');
    document.body.appendChild(outside);
    const w = createEditable({ defaultValue: 'v1', startWithEditMode: true, submitMode: 'blur' });
    await nextTick();
    const input = w.find('input');
    (input.element as HTMLInputElement).value = 'v2';
    await input.trigger('input');
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    await waitForBlurTimers();
    const root = w.findComponent(EditableRoot);
    expect(root.emitted('submit')?.at(-1)).toEqual(['v2']);
    outside.remove();
    w.unmount();
  });

  it('cancels on pointerdown outside the root (submitMode enter)', async () => {
    const outside = document.createElement('div');
    document.body.appendChild(outside);
    const w = createEditable({ defaultValue: 'v1', startWithEditMode: true, submitMode: 'enter' });
    await nextTick();
    const input = w.find('input');
    (input.element as HTMLInputElement).value = 'v2';
    await input.trigger('input');
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    await waitForBlurTimers();
    const root = w.findComponent(EditableRoot);
    expect(root.emitted('submit')).toBeUndefined();
    expect(w.find('span').text()).toBe('v1');
    outside.remove();
    w.unmount();
  });

  it('does not dismiss on pointerdown inside the root', async () => {
    const w = createEditable({ defaultValue: 'v1', startWithEditMode: true, submitMode: 'blur' });
    await nextTick();
    const input = w.find('input');
    (input.element as HTMLInputElement).value = 'v2';
    await input.trigger('input');
    input.element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    await waitForBlurTimers();
    const root = w.findComponent(EditableRoot);
    expect(root.emitted('submit')).toBeUndefined();
    expect((input.element as HTMLInputElement).hidden).toBe(false);
    w.unmount();
  });
});
