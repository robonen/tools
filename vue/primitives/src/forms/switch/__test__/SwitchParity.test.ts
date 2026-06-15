import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { Switch, SwitchThumb, useSwitchContext } from '../index';

describe('switchThumb — context-driven part', () => {
  it('mirrors the root data-state and toggles with it', async () => {
    const w = mount(Switch, {
      attachTo: document.body,
      slots: { default: () => h(SwitchThumb) },
    });
    const thumb = w.element.querySelector('span') as HTMLElement;
    expect(thumb).toBeTruthy();
    expect(thumb.getAttribute('data-state')).toBe('unchecked');

    (w.element as HTMLElement).click();
    await nextTick();
    expect(thumb.getAttribute('data-state')).toBe('checked');

    (w.element as HTMLElement).click();
    await nextTick();
    expect(thumb.getAttribute('data-state')).toBe('unchecked');
    w.unmount();
  });

  it('reflects data-disabled from the root', () => {
    const w = mount(Switch, {
      attachTo: document.body,
      props: { disabled: true },
      slots: { default: () => h(SwitchThumb) },
    });
    const thumb = w.element.querySelector('span') as HTMLElement;
    expect(thumb.getAttribute('data-disabled')).toBe('');
    w.unmount();
  });

  it('has no data-disabled when enabled', () => {
    const w = mount(Switch, {
      attachTo: document.body,
      slots: { default: () => h(SwitchThumb) },
    });
    const thumb = w.element.querySelector('span') as HTMLElement;
    expect(thumb.getAttribute('data-disabled')).toBeNull();
    w.unmount();
  });

  it('honours a polymorphic `as` host', () => {
    const w = mount(Switch, {
      attachTo: document.body,
      slots: { default: () => h(SwitchThumb, { as: 'div' }) },
    });
    expect(w.element.querySelector('div')).toBeTruthy();
    w.unmount();
  });

  it('exposes checked to its default slot', async () => {
    let captured: unknown;
    const w = mount(Switch, {
      attachTo: document.body,
      props: { defaultValue: true },
      slots: {
        default: () => h(SwitchThumb, null, {
          default: (scope: { checked: boolean }) => {
            captured = scope.checked;
            return '';
          },
        }),
      },
    });
    await nextTick();
    expect(captured).toBe(true);
    w.unmount();
  });

  it('throws when used without a switch ancestor', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => mount(SwitchThumb, { attachTo: document.body })).toThrow();
    spy.mockRestore();
  });
});

describe('switchContext — public hook', () => {
  it('provides checked + disabled to descendants', async () => {
    let ctxChecked: boolean | undefined;
    const Consumer = defineComponent({
      setup() {
        const ctx = useSwitchContext();
        return () => {
          ctxChecked = ctx.checked.value;
          return h('i');
        };
      },
    });
    const w = mount(Switch, {
      attachTo: document.body,
      props: { defaultValue: true },
      slots: { default: () => h(Consumer) },
    });
    await nextTick();
    expect(ctxChecked).toBe(true);
    w.unmount();
  });
});

describe('switch — accessible name from <label for>', () => {
  let label: HTMLLabelElement | undefined;
  afterEach(() => {
    label?.remove();
    label = undefined;
  });

  it('derives aria-label from an associated label when id is set', async () => {
    label = document.createElement('label');
    label.setAttribute('for', 'sw-1');
    label.textContent = 'Airplane mode';
    document.body.appendChild(label);

    const w = mount(Switch, { attachTo: document.body, props: { id: 'sw-1' } });
    await nextTick();
    expect(w.element.getAttribute('aria-label')).toBe('Airplane mode');
    expect(w.element.getAttribute('id')).toBe('sw-1');
    w.unmount();
  });

  it('an explicit aria-label wins over the derived one', async () => {
    label = document.createElement('label');
    label.setAttribute('for', 'sw-2');
    label.textContent = 'Derived';
    document.body.appendChild(label);

    const w = mount(Switch, {
      attachTo: document.body,
      props: { id: 'sw-2' },
      attrs: { 'aria-label': 'Explicit' },
    });
    await nextTick();
    expect(w.element.getAttribute('aria-label')).toBe('Explicit');
    w.unmount();
  });

  it('has no aria-label when neither id-label nor explicit label exist', () => {
    const w = mount(Switch, { attachTo: document.body });
    expect(w.element.getAttribute('aria-label')).toBeNull();
    w.unmount();
  });
});

describe('switch — hidden form input', () => {
  it('renders a hidden checkbox input mirroring state', () => {
    const w = mount(Switch, {
      attachTo: document.body,
      props: { name: 'agree', defaultValue: true },
    });
    const input = w.element.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.name).toBe('agree');
    expect(input.checked).toBe(true);
    expect(input.value).toBe('true');
    w.unmount();
  });

  it('an explicit value prop overrides the serialized form value', () => {
    const w = mount(Switch, {
      attachTo: document.body,
      props: { name: 'agree', value: 'yes-please', defaultValue: true },
    });
    const input = w.element.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input.value).toBe('yes-please');
    w.unmount();
  });

  it('serializes custom string truthy/falsy pairs', async () => {
    const w = mount(Switch, {
      attachTo: document.body,
      props: { name: 'mode', truthy: 'on', falsy: 'off', defaultValue: 'on' },
    });
    expect((w.element.querySelector('input') as HTMLInputElement).value).toBe('on');
    (w.element as HTMLElement).click();
    await nextTick();
    expect((w.element.querySelector('input') as HTMLInputElement).value).toBe('off');
    w.unmount();
  });

  it('mirrors disabled and required onto the hidden input', () => {
    const w = mount(Switch, {
      attachTo: document.body,
      props: { name: 'agree', disabled: true, required: true },
    });
    const input = w.element.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input.disabled).toBe(true);
    expect(input.required).toBe(true);
    w.unmount();
  });

  it('dispatches native change events on the hidden input when toggled programmatically', async () => {
    const model = ref(false);
    const Harness = defineComponent({
      setup: () => () => h(Switch, {
        name: 'agree',
        modelValue: model.value,
        'onUpdate:modelValue': (v: unknown) => { model.value = v as boolean; },
      }),
    });
    const w = mount(Harness, { attachTo: document.body });
    const input = w.element.querySelector('input[type="checkbox"]') as HTMLInputElement;
    const onChange = vi.fn();
    input.addEventListener('change', onChange);

    model.value = true;
    await nextTick();
    await nextTick();
    expect(onChange).toHaveBeenCalled();
    w.unmount();
  });

  it('does not render a hidden input without a name', () => {
    const w = mount(Switch, { attachTo: document.body });
    expect(w.element.querySelector('input[type="checkbox"]')).toBeNull();
    w.unmount();
  });
});
