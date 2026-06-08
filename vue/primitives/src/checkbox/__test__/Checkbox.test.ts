import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { CheckboxIndicator, CheckboxRoot } from '../index';

function mountCheckbox(props: Record<string, unknown> = {}) {
  return mount(CheckboxRoot, {
    attachTo: document.body,
    props,
    slots: {
      default: () => h(CheckboxIndicator, null, { default: () => '✓' }),
    },
  });
}

describe('Checkbox', () => {
  it('renders role="checkbox" with aria-checked="false" initially', () => {
    const w = mountCheckbox();
    const el = w.element;
    expect(el.getAttribute('role')).toBe('checkbox');
    expect(el.getAttribute('aria-checked')).toBe('false');
    expect(el.getAttribute('data-state')).toBe('unchecked');
    w.unmount();
  });

  it('toggles on click', async () => {
    const w = mountCheckbox();
    const el = w.element as HTMLElement;
    el.click();
    await nextTick();
    expect(el.getAttribute('aria-checked')).toBe('true');
    expect(el.getAttribute('data-state')).toBe('checked');
    el.click();
    await nextTick();
    expect(el.getAttribute('aria-checked')).toBe('false');
    w.unmount();
  });

  it('honours defaultChecked', () => {
    const w = mountCheckbox({ defaultChecked: true });
    expect(w.element.getAttribute('aria-checked')).toBe('true');
    w.unmount();
  });

  it('supports indeterminate state with aria-checked="mixed"', async () => {
    const checked = ref<boolean | 'indeterminate'>('indeterminate');
    const Harness = defineComponent({
      setup: () => () => h(CheckboxRoot, {
        checked: checked.value,
        'onUpdate:checked': (v: boolean | 'indeterminate' | undefined) => { checked.value = v!; },
      }, { default: () => h(CheckboxIndicator) }),
    });
    const w = mount(Harness, { attachTo: document.body });
    expect(w.element.getAttribute('aria-checked')).toBe('mixed');
    (w.element as HTMLElement).click();
    await nextTick();
    // Click from indeterminate → true
    expect(checked.value).toBe(true);
    w.unmount();
  });

  it('disabled: no toggle on click, aria-disabled set', async () => {
    const w = mountCheckbox({ disabled: true });
    const el = w.element as HTMLElement;
    expect(el.getAttribute('aria-disabled')).toBe('true');
    el.click();
    await nextTick();
    expect(el.getAttribute('aria-checked')).toBe('false');
    w.unmount();
  });

  it('emits checkedChange', async () => {
    const w = mountCheckbox();
    (w.element as HTMLElement).click();
    await nextTick();
    expect(w.emitted('checkedChange')).toEqual([[true]]);
    w.unmount();
  });

  it('renders hidden input when name is set', async () => {
    const w = mountCheckbox({ name: 'agree', value: 'yes', defaultChecked: true });
    const input = w.element.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.name).toBe('agree');
    expect(input.value).toBe('yes');
    expect(input.checked).toBe(true);
    w.unmount();
  });

  it('CheckboxIndicator only renders when checked (or forceMount)', async () => {
    const w = mountCheckbox();
    expect(w.element.querySelector('span')).toBeNull();
    (w.element as HTMLElement).click();
    await nextTick();
    expect(w.element.querySelector('span')).toBeTruthy();
    w.unmount();
  });

  it('CheckboxIndicator forceMount stays mounted when unchecked', () => {
    const w = mount(CheckboxRoot, {
      attachTo: document.body,
      slots: {
        default: () => h(CheckboxIndicator, { forceMount: true }, { default: () => '✓' }),
      },
    });
    expect(w.element.querySelector('span')).toBeTruthy();
    w.unmount();
  });
});
