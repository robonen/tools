import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { DatePickerField, DatePickerFieldRoot, DatePickerRoot } from '../index';

let active: { unmount: () => void } | undefined;

afterEach(() => {
  active?.unmount();
  active = undefined;
});

describe('DatePickerField editable text', () => {
  it('parses a date typed the way the field displays it', async () => {
    let model: Date | undefined;
    const wrapper = mount(defineComponent({
      setup: () => () => h(DatePickerRoot, {
        locale: 'ru',
        'onUpdate:modelValue': (value: Date | undefined) => { model = value; },
      }, {
        default: () => h(DatePickerField, { editable: true }),
      }),
    }), { attachTo: document.body });
    active = wrapper;
    await nextTick();

    const input = wrapper.element.querySelector('input')!;
    input.value = '05.06.2023';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await nextTick();

    expect(model).toBeInstanceOf(Date);
    expect([model!.getFullYear(), model!.getMonth() + 1, model!.getDate()]).toEqual([2023, 6, 5]);
  });
});

describe('DatePicker native validation input', () => {
  it('is hidden from assistive technology — the segments are the control', async () => {
    const wrapper = mount(defineComponent({
      setup: () => () => h(DatePickerRoot, { required: true, name: 'date' }, {
        default: () => h(DatePickerFieldRoot),
      }),
    }), { attachTo: document.body });
    active = wrapper;
    await nextTick();

    const input = wrapper.element.querySelector<HTMLInputElement>('input[type="date"]')!;
    expect(input).toBeTruthy();
    expect(input.getAttribute('aria-hidden')).toBe('true');
    expect(input.tabIndex).toBe(-1);
  });
});
