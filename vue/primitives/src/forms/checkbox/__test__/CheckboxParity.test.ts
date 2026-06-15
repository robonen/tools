import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { CheckboxGroupRoot, CheckboxIndicator, CheckboxRoot } from '../index';

function press(el: Element, key: string) {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

describe('CheckboxRoot — generic value (trueValue/falseValue)', () => {
  it('models arbitrary string values via trueValue/falseValue', async () => {
    const model = ref<string>('no');
    const Harness = defineComponent({
      setup: () => () => h(CheckboxRoot, {
        checked: model.value,
        trueValue: 'yes',
        falseValue: 'no',
        'onUpdate:checked': (v: unknown) => { model.value = v as string; },
      }),
    });
    const w = mount(Harness, { attachTo: document.body });
    const el = w.element as HTMLElement;
    expect(el.getAttribute('aria-checked')).toBe('false');
    expect(el.getAttribute('data-state')).toBe('unchecked');

    el.click();
    await nextTick();
    expect(model.value).toBe('yes');
    expect(el.getAttribute('aria-checked')).toBe('true');

    el.click();
    await nextTick();
    expect(model.value).toBe('no');
    w.unmount();
  });

  it('compares object values by deep equality', async () => {
    const trueVal = { id: 1 };
    const model = ref<unknown>({ id: 0 });
    const Harness = defineComponent({
      setup: () => () => h(CheckboxRoot, {
        checked: model.value,
        trueValue: trueVal,
        falseValue: { id: 0 },
        'onUpdate:checked': (v: unknown) => { model.value = v; },
      }),
    });
    const w = mount(Harness, { attachTo: document.body });
    const el = w.element as HTMLElement;
    expect(el.getAttribute('aria-checked')).toBe('false');
    el.click();
    await nextTick();
    // Deeply equal to trueValue → checked.
    expect(el.getAttribute('aria-checked')).toBe('true');
    w.unmount();
  });

  it('uncontrolled defaultChecked seeds the generic model', () => {
    const w = mount(CheckboxRoot, {
      attachTo: document.body,
      props: { defaultChecked: 'yes', trueValue: 'yes', falseValue: 'no' },
    });
    expect(w.element.getAttribute('aria-checked')).toBe('true');
    w.unmount();
  });
});

describe('CheckboxRoot — slot contract', () => {
  it('exposes checked, modelValue and state to the default slot', async () => {
    let captured: Record<string, unknown> = {};
    const w = mount(CheckboxRoot, {
      attachTo: document.body,
      props: { defaultChecked: true },
      slots: {
        default: (scope: Record<string, unknown>) => {
          captured = scope;
          return '';
        },
      },
    });
    await nextTick();
    expect(captured.checked).toBe(true);
    expect(captured.state).toBe(true);
    expect('modelValue' in captured).toBe(true);
    w.unmount();
  });
});

describe('CheckboxRoot — aria-label from associated label', () => {
  it('derives aria-label from a <label for> when id is set', async () => {
    const label = document.createElement('label');
    label.setAttribute('for', 'cb-1');
    label.textContent = 'Accept terms';
    document.body.appendChild(label);

    const w = mount(CheckboxRoot, {
      attachTo: document.body,
      props: { id: 'cb-1' },
    });
    await nextTick();
    expect(w.element.getAttribute('aria-label')).toBe('Accept terms');
    w.unmount();
    label.remove();
  });

  it('an explicit aria-label wins over the derived one', async () => {
    const label = document.createElement('label');
    label.setAttribute('for', 'cb-2');
    label.textContent = 'Derived';
    document.body.appendChild(label);

    const w = mount(CheckboxRoot, {
      attachTo: document.body,
      props: { id: 'cb-2' },
      attrs: { 'aria-label': 'Explicit' },
    });
    await nextTick();
    expect(w.element.getAttribute('aria-label')).toBe('Explicit');
    w.unmount();
    label.remove();
  });
});

describe('CheckboxRoot — hidden form input', () => {
  it('renders a native hidden checkbox input mirroring state', async () => {
    const w = mount(CheckboxRoot, {
      attachTo: document.body,
      props: { name: 'agree', value: 'on', defaultChecked: true },
    });
    const input = w.element.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.name).toBe('agree');
    expect(input.checked).toBe(true);
    w.unmount();
  });

  it('does not render a hidden input without a name', () => {
    const w = mount(CheckboxRoot, { attachTo: document.body });
    expect(w.element.querySelector('input[type="checkbox"]')).toBeNull();
    w.unmount();
  });
});

describe('CheckboxRoot — keyboard', () => {
  it('Enter does not toggle (WAI-ARIA) and is prevented', async () => {
    const w = mount(CheckboxRoot, { attachTo: document.body });
    const el = w.element as HTMLElement;
    const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    el.dispatchEvent(ev);
    await nextTick();
    expect(el.getAttribute('aria-checked')).toBe('false');
    expect(ev.defaultPrevented).toBe(true);
    w.unmount();
  });

  it('Space toggles on a non-button host', async () => {
    const w = mount(CheckboxRoot, { attachTo: document.body, props: { as: 'div' } });
    const el = w.element as HTMLElement;
    expect(el.getAttribute('tabindex')).toBe('0');
    press(el, ' ');
    await nextTick();
    expect(el.getAttribute('aria-checked')).toBe('true');
    w.unmount();
  });
});

describe('CheckboxIndicator — Presence', () => {
  it('forceMount keeps it mounted with data-state unchecked', () => {
    const w = mount(CheckboxRoot, {
      attachTo: document.body,
      slots: {
        default: () => h(CheckboxIndicator, { forceMount: true }, { default: () => '✓' }),
      },
    });
    const span = w.element.querySelector('span') as HTMLElement;
    expect(span).toBeTruthy();
    expect(span.getAttribute('data-state')).toBe('unchecked');
    w.unmount();
  });

  it('mounts on check and unmounts on uncheck (no animation)', async () => {
    const w = mount(CheckboxRoot, {
      attachTo: document.body,
      slots: {
        default: () => h(CheckboxIndicator, null, { default: () => '✓' }),
      },
    });
    const el = w.element as HTMLElement;
    expect(el.querySelector('span')).toBeNull();
    el.click();
    await nextTick();
    expect(el.querySelector('span')).toBeTruthy();
    el.click();
    await nextTick();
    expect(el.querySelector('span')).toBeNull();
    w.unmount();
  });
});

describe('CheckboxGroupRoot', () => {
  function mountGroup(props: Record<string, unknown> = {}, values = ['a', 'b', 'c']) {
    const Harness = defineComponent({
      props: { groupProps: { type: Object, default: () => ({}) } },
      setup: p => () => h('div', [
        h(CheckboxGroupRoot, p.groupProps, {
          default: () => values.map(v => h(CheckboxRoot, { key: v, value: v })),
        }),
      ]),
    });
    return mount(Harness, { attachTo: document.body, props: { groupProps: props } });
  }

  it('renders role="group" and checks members present in the model', async () => {
    const w = mountGroup({ defaultValue: ['b'] });
    const group = w.element.querySelector('[role="group"]') as HTMLElement;
    expect(group).toBeTruthy();
    const boxes = w.element.querySelectorAll('[role="checkbox"]');
    expect(boxes.length).toBe(3);
    expect(boxes[0]!.getAttribute('aria-checked')).toBe('false');
    expect(boxes[1]!.getAttribute('aria-checked')).toBe('true');
    w.unmount();
  });

  it('toggling a member adds/removes its value in the group model', async () => {
    const model = ref<string[]>([]);
    const Harness = defineComponent({
      setup: () => () => h(CheckboxGroupRoot, {
        modelValue: model.value,
        'onUpdate:modelValue': (v: string[]) => { model.value = v; },
      }, {
        default: () => ['a', 'b'].map(v => h(CheckboxRoot, { key: v, value: v })),
      }),
    });
    const w = mount(Harness, { attachTo: document.body });
    const boxes = w.element.querySelectorAll('[role="checkbox"]');

    (boxes[0] as HTMLElement).click();
    await nextTick();
    expect(model.value).toEqual(['a']);

    (boxes[1] as HTMLElement).click();
    await nextTick();
    expect(model.value).toEqual(['a', 'b']);

    (boxes[0] as HTMLElement).click();
    await nextTick();
    expect(model.value).toEqual(['b']);
    w.unmount();
  });

  it('emits valueChange alongside update:modelValue', async () => {
    const Harness = defineComponent({
      emits: ['valueChange'],
      setup: (_, { emit }) => () => h(CheckboxGroupRoot, {
        onValueChange: (v: string[]) => emit('valueChange', v),
      }, {
        default: () => [h(CheckboxRoot, { value: 'x' })],
      }),
    });
    const w = mount(Harness, { attachTo: document.body });
    (w.element.querySelector('[role="checkbox"]') as HTMLElement).click();
    await nextTick();
    expect(w.emitted('valueChange')).toEqual([[['x']]]);
    w.unmount();
  });

  it('group-level disabled blocks toggling and reflects on members', async () => {
    const w = mountGroup({ disabled: true, defaultValue: [] });
    const box = w.element.querySelector('[role="checkbox"]') as HTMLElement;
    expect(box.getAttribute('aria-disabled')).toBe('true');
    box.click();
    await nextTick();
    expect(box.getAttribute('aria-checked')).toBe('false');
    w.unmount();
  });

  it('renders hidden inputs for the selection inside a form', async () => {
    const Harness = defineComponent({
      setup: () => () => h('form', [
        h(CheckboxGroupRoot, { name: 'fruits', defaultValue: ['a', 'c'] }, {
          default: () => ['a', 'b', 'c'].map(v => h(CheckboxRoot, { key: v, value: v })),
        }),
      ]),
    });
    const w = mount(Harness, { attachTo: document.body });
    await nextTick();
    const inputs = Array.from(w.element.querySelectorAll('input[name^="fruits"]')) as HTMLInputElement[];
    expect(inputs.length).toBe(2);
    expect(inputs.map(i => i.value)).toEqual(['a', 'c']);
    w.unmount();
  });

  it('grouped members do not render their own hidden form input', async () => {
    const Harness = defineComponent({
      setup: () => () => h('form', [
        h(CheckboxGroupRoot, { defaultValue: ['a'] }, {
          default: () => [h(CheckboxRoot, { value: 'a', name: 'should-be-ignored' })],
        }),
      ]),
    });
    const w = mount(Harness, { attachTo: document.body });
    await nextTick();
    expect(w.element.querySelector('input[name="should-be-ignored"]')).toBeNull();
    w.unmount();
  });

  it('roving focus moves focus across members with arrow keys', async () => {
    const w = mountGroup({ rovingFocus: true, orientation: 'horizontal' });
    const boxes = Array.from(w.element.querySelectorAll('[role="checkbox"]')) as HTMLElement[];
    boxes[0]!.focus();
    await nextTick();
    press(boxes[0]!, 'ArrowRight');
    await nextTick();
    expect(document.activeElement).toBe(boxes[1]);
    w.unmount();
  });

  it('without rovingFocus, no RovingFocusGroup container is rendered', async () => {
    const w = mountGroup({ rovingFocus: false });
    // Members are still functional checkboxes.
    const boxes = w.element.querySelectorAll('[role="checkbox"]');
    expect(boxes.length).toBe(3);
    (boxes[0] as HTMLElement).click();
    await nextTick();
    expect(boxes[0]!.getAttribute('aria-checked')).toBe('true');
    w.unmount();
  });
});
