import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { provideConfig } from '../../../utilities/config-provider';
import {
  Radio,
  RadioGroupIndicator,
  RadioGroupItem,
  RadioGroupRoot,
  useRadioGroupContext,
  useRadioGroupItemContext,
} from '../index';

function press(el: Element, key: string): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('RadioGroup — non-string values', () => {
  it('supports number values (controlled selection + check state)', async () => {
    const model = ref<number | undefined>(undefined);
    const Harness = defineComponent({
      setup: () => () => h(RadioGroupRoot, {
        modelValue: model.value,
        'onUpdate:modelValue': (v: number | undefined) => { model.value = v; },
      }, {
        default: () => [
          h(RadioGroupItem, { value: 1, id: 'one' }),
          h(RadioGroupItem, { value: 2, id: 'two' }),
        ],
      }),
    });
    const wrapper = mount(Harness, { attachTo: document.body });
    await nextTick();
    document.querySelector<HTMLButtonElement>('#two')!.click();
    await nextTick();
    expect(model.value).toBe(2);
    expect(document.querySelector('#two')!.getAttribute('aria-checked')).toBe('true');
    expect(document.querySelector('#one')!.getAttribute('aria-checked')).toBe('false');
    wrapper.unmount();
  });

  it('supports boolean values', async () => {
    const model = ref<boolean | undefined>(undefined);
    const Harness = defineComponent({
      setup: () => () => h(RadioGroupRoot, {
        modelValue: model.value,
        'onUpdate:modelValue': (v: boolean | undefined) => { model.value = v; },
      }, {
        default: () => [
          h(RadioGroupItem, { value: true, id: 'yes' }),
          h(RadioGroupItem, { value: false, id: 'no' }),
        ],
      }),
    });
    const wrapper = mount(Harness, { attachTo: document.body });
    await nextTick();
    document.querySelector<HTMLButtonElement>('#no')!.click();
    await nextTick();
    expect(model.value).toBe(false);
    expect(document.querySelector('#no')!.getAttribute('aria-checked')).toBe('true');
    wrapper.unmount();
  });

  it('compares object values structurally (deep equality)', async () => {
    const optA = { id: 'a' };
    const model = ref<Record<string, unknown> | undefined>(undefined);
    const Harness = defineComponent({
      setup: () => () => h(RadioGroupRoot, {
        modelValue: model.value,
        'onUpdate:modelValue': (v: Record<string, unknown> | undefined) => { model.value = v; },
      }, {
        default: () => [
          h(RadioGroupItem, { value: optA, id: 'oa' }),
          h(RadioGroupItem, { value: { id: 'b' }, id: 'ob' }),
        ],
      }),
    });
    const wrapper = mount(Harness, { attachTo: document.body });
    await nextTick();
    // Select via a structurally-equal (not identical) object.
    model.value = { id: 'a' };
    await nextTick();
    expect(document.querySelector('#oa')!.getAttribute('aria-checked')).toBe('true');
    wrapper.unmount();
  });

  it('honours a `by` property-key comparator', async () => {
    const model = ref<Record<string, unknown> | undefined>({ id: 1, label: 'stale' });
    const Harness = defineComponent({
      setup: () => () => h(RadioGroupRoot, {
        modelValue: model.value,
        by: 'id',
        'onUpdate:modelValue': (v: Record<string, unknown> | undefined) => { model.value = v; },
      }, {
        default: () => [
          h(RadioGroupItem, { value: { id: 1, label: 'fresh' }, id: 'i1' }),
          h(RadioGroupItem, { value: { id: 2, label: 'other' }, id: 'i2' }),
        ],
      }),
    });
    const wrapper = mount(Harness, { attachTo: document.body });
    await nextTick();
    // Different object identity + different label, same `id` → checked.
    expect(document.querySelector('#i1')!.getAttribute('aria-checked')).toBe('true');
    expect(document.querySelector('#i2')!.getAttribute('aria-checked')).toBe('false');
    wrapper.unmount();
  });
});

function mountGroup(opts: Record<string, unknown> = {}, itemOpts: Array<Record<string, unknown>> = []) {
  const model = ref<string | undefined>(undefined);
  const defaults = itemOpts.length
    ? itemOpts
    : [
        { value: 'a', id: 'a' },
        { value: 'b', id: 'b' },
        { value: 'c', id: 'c', disabled: true },
      ];
  const Harness = defineComponent({
    setup: () => () => h(RadioGroupRoot, {
      modelValue: model.value,
      'onUpdate:modelValue': (v: string | undefined) => { model.value = v; },
      ...opts,
    }, {
      default: () => defaults.map(d => h(RadioGroupItem, d)),
    }),
  });
  return { wrapper: mount(Harness, { attachTo: document.body }), model };
}

describe('RadioGroup — PageUp/PageDown', () => {
  it('PageDown jumps to last enabled item, PageUp to first', async () => {
    const { wrapper, model } = mountGroup({ defaultValue: 'a' });
    await nextTick();
    const a = document.querySelector<HTMLButtonElement>('#a')!;
    const b = document.querySelector<HTMLButtonElement>('#b')!;
    a.focus();
    press(a, 'PageDown');
    await nextTick();
    // 'c' is disabled in the default set, so last enabled is 'b'.
    expect(document.activeElement).toBe(b);
    expect(model.value).toBe('b');
    press(b, 'PageUp');
    await nextTick();
    expect(document.activeElement).toBe(a);
    expect(model.value).toBe('a');
    wrapper.unmount();
  });
});

describe('RadioGroup — cancelable select event', () => {
  it('emits select and applies value when not prevented', async () => {
    const model = ref<string | undefined>(undefined);
    const onSelect = vi.fn();
    const Harness = defineComponent({
      setup: () => () => h(RadioGroupRoot, {
        modelValue: model.value,
        'onUpdate:modelValue': (v: string | undefined) => { model.value = v; },
      }, {
        default: () => [
          h(RadioGroupItem, { value: 'a', id: 'a', onSelect }),
          h(RadioGroupItem, { value: 'b', id: 'b' }),
        ],
      }),
    });
    const wrapper = mount(Harness, { attachTo: document.body });
    await nextTick();
    document.querySelector<HTMLButtonElement>('#a')!.click();
    await nextTick();
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(model.value).toBe('a');
    wrapper.unmount();
  });

  it('vetoes selection when preventDefault is called', async () => {
    const model = ref<string | undefined>(undefined);
    const Harness = defineComponent({
      setup: () => () => h(RadioGroupRoot, {
        modelValue: model.value,
        'onUpdate:modelValue': (v: string | undefined) => { model.value = v; },
      }, {
        default: () => [
          h(RadioGroupItem, { value: 'a', id: 'a', onSelect: (e: CustomEvent) => e.preventDefault() }),
          h(RadioGroupItem, { value: 'b', id: 'b' }),
        ],
      }),
    });
    const wrapper = mount(Harness, { attachTo: document.body });
    await nextTick();
    document.querySelector<HTMLButtonElement>('#a')!.click();
    await nextTick();
    expect(model.value).toBeUndefined();
    expect(document.querySelector('#a')!.getAttribute('aria-checked')).toBe('false');
    wrapper.unmount();
  });
});

describe('RadioGroup — accessibility', () => {
  it('group-level required propagates aria-required to each item', async () => {
    const { wrapper } = mountGroup({ required: true });
    await nextTick();
    expect(document.querySelector('#a')!.getAttribute('aria-required')).toBe('true');
    expect(document.querySelector('#b')!.getAttribute('aria-required')).toBe('true');
    wrapper.unmount();
  });

  it('derives aria-label from an associated <label for=id>', async () => {
    const label = document.createElement('label');
    label.setAttribute('for', 'labelled');
    label.textContent = 'Pick me';
    document.body.appendChild(label);

    const { wrapper } = mountGroup({}, [
      { value: 'x', id: 'labelled' },
      { value: 'y', id: 'plain' },
    ]);
    await nextTick();
    await nextTick();
    expect(document.querySelector('#labelled')!.getAttribute('aria-label')).toBe('Pick me');
    expect(document.querySelector('#plain')!.getAttribute('aria-label')).toBeNull();
    wrapper.unmount();
    label.remove();
  });

  it('Enter does not select a radio (WAI-ARIA)', async () => {
    const { wrapper, model } = mountGroup();
    await nextTick();
    const a = document.querySelector<HTMLButtonElement>('#a')!;
    a.focus();
    press(a, 'Enter');
    await nextTick();
    expect(model.value).toBeUndefined();
    wrapper.unmount();
  });
});

describe('RadioGroup — RTL via ConfigProvider', () => {
  it('inherits dir=rtl from ConfigProvider and flips horizontal arrows', async () => {
    const model = ref<string | undefined>('b');
    const RtlProvider = defineComponent({
      setup(_, { slots }) {
        provideConfig({ dir: 'rtl' });
        return () => slots.default?.();
      },
    });
    const Harness = defineComponent({
      setup: () => () => h(RtlProvider, null, {
        default: () => h(RadioGroupRoot, {
          modelValue: model.value,
          orientation: 'horizontal',
          'onUpdate:modelValue': (v: string | undefined) => { model.value = v; },
        }, {
          default: () => [
            h(RadioGroupItem, { value: 'a', id: 'a' }),
            h(RadioGroupItem, { value: 'b', id: 'b' }),
          ],
        }),
      }),
    });
    const wrapper = mount(Harness, { attachTo: document.body });
    await nextTick();
    const b = document.querySelector<HTMLButtonElement>('#b')!;
    const a = document.querySelector<HTMLButtonElement>('#a')!;
    b.focus();
    // In RTL, ArrowLeft moves to the *next* item (a is after b visually).
    press(b, 'ArrowLeft');
    await nextTick();
    expect(document.activeElement).toBe(a);
    expect(model.value).toBe('a');
    expect((wrapper.element.querySelector('[role="radiogroup"]') as HTMLElement).getAttribute('dir')).toBe('rtl');
    wrapper.unmount();
  });
});

describe('RadioGroup — form gating', () => {
  it('does NOT render a hidden input outside a form even when name is set', async () => {
    const { wrapper } = mountGroup({ name: 'fruit' });
    await nextTick();
    await nextTick();
    expect(document.querySelector('input[type="radio"][name="fruit"]')).toBeNull();
    wrapper.unmount();
  });
});

describe('RadioGroup — Indicator presence', () => {
  it('renders the indicator for the checked item and removes it when unchecked', async () => {
    const model = ref<string | undefined>('a');
    const Harness = defineComponent({
      setup: () => () => h(RadioGroupRoot, {
        modelValue: model.value,
        'onUpdate:modelValue': (v: string | undefined) => { model.value = v; },
      }, {
        default: () => [
          h(RadioGroupItem, { value: 'a', id: 'a' }, { default: () => h(RadioGroupIndicator) }),
          h(RadioGroupItem, { value: 'b', id: 'b' }, { default: () => h(RadioGroupIndicator) }),
        ],
      }),
    });
    const wrapper = mount(Harness, { attachTo: document.body });
    await nextTick();
    expect(document.querySelector('#a')!.querySelector('span')).toBeTruthy();
    expect(document.querySelector('#b')!.querySelector('span')).toBeNull();
    model.value = 'b';
    await nextTick();
    await nextTick();
    expect(document.querySelector('#b')!.querySelector('span')).toBeTruthy();
    wrapper.unmount();
  });

  it('forceMount keeps the indicator mounted while unchecked', async () => {
    const model = ref<string | undefined>(undefined);
    const Harness = defineComponent({
      setup: () => () => h(RadioGroupRoot, {
        modelValue: model.value,
        'onUpdate:modelValue': (v: string | undefined) => { model.value = v; },
      }, {
        default: () => [
          h(RadioGroupItem, { value: 'a', id: 'fa' }, { default: () => h(RadioGroupIndicator, { forceMount: true }) }),
        ],
      }),
    });
    const w2 = mount(Harness, { attachTo: document.body });
    await nextTick();
    expect(document.querySelector('#fa')!.querySelector('span')).toBeTruthy();
    w2.unmount();
  });
});

describe('RadioGroup — context exports', () => {
  it('exposes useRadioGroupContext and useRadioGroupItemContext to custom parts', async () => {
    const seen: { group?: boolean; item?: boolean } = {};
    const CustomPart = defineComponent({
      setup() {
        const group = useRadioGroupContext();
        const item = useRadioGroupItemContext();
        seen.group = typeof group.setValue === 'function';
        seen.item = item.value !== undefined;
        return () => h('i', { 'data-checked': item.checked.value });
      },
    });
    const model = ref<string | undefined>('a');
    const Harness = defineComponent({
      setup: () => () => h(RadioGroupRoot, {
        modelValue: model.value,
        'onUpdate:modelValue': (v: string | undefined) => { model.value = v; },
      }, {
        default: () => [
          h(RadioGroupItem, { value: 'a', id: 'a' }, { default: () => h(CustomPart) }),
        ],
      }),
    });
    const wrapper = mount(Harness, { attachTo: document.body });
    await nextTick();
    expect(seen.group).toBe(true);
    expect(seen.item).toBe(true);
    expect(document.querySelector('i')!.getAttribute('data-checked')).toBe('true');
    wrapper.unmount();
  });
});

describe('Radio — standalone', () => {
  it('toggles its own checked state on click', async () => {
    const checked = ref(false);
    const Harness = defineComponent({
      setup: () => () => h(Radio, {
        checked: checked.value,
        value: 'solo',
        id: 'solo',
        'onUpdate:checked': (v: boolean) => { checked.value = v; },
      }),
    });
    const wrapper = mount(Harness, { attachTo: document.body });
    await nextTick();
    const el = document.querySelector<HTMLButtonElement>('#solo')!;
    expect(el.getAttribute('role')).toBe('radio');
    expect(el.getAttribute('aria-checked')).toBe('false');
    el.click();
    await nextTick();
    expect(checked.value).toBe(true);
    expect(el.getAttribute('aria-checked')).toBe('true');
    wrapper.unmount();
  });

  it('honours a vetoing select handler', async () => {
    const checked = ref(false);
    const Harness = defineComponent({
      setup: () => () => h(Radio, {
        checked: checked.value,
        value: 'solo',
        id: 'solo',
        'onUpdate:checked': (v: boolean) => { checked.value = v; },
        onSelect: (e: CustomEvent) => e.preventDefault(),
      }),
    });
    const wrapper = mount(Harness, { attachTo: document.body });
    await nextTick();
    document.querySelector<HTMLButtonElement>('#solo')!.click();
    await nextTick();
    expect(checked.value).toBe(false);
    wrapper.unmount();
  });

  it('renders a hidden form input inside a <form> and submits its value', async () => {
    const submitted = ref<FormData | null>(null);
    const Harness = defineComponent({
      setup: () => () => h('form', {
        onSubmit: (e: SubmitEvent) => {
          e.preventDefault();
          submitted.value = new FormData(e.target as HTMLFormElement);
        },
      }, [
        h(Radio, { value: 'solo', name: 'choice', id: 'solo', checked: true }),
        h('button', { type: 'submit', id: 'submit' }, 'go'),
      ]),
    });
    const wrapper = mount(Harness, { attachTo: document.body });
    await nextTick();
    await nextTick();
    const input = wrapper.element.querySelector('input[type="radio"][name="choice"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    (wrapper.element as HTMLFormElement).requestSubmit();
    await nextTick();
    expect(submitted.value!.get('choice')).toBe('solo');
    wrapper.unmount();
  });
});
