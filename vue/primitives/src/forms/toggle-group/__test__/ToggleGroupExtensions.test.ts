import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { provideConfig } from '../../../utilities/config-provider';
import { ToggleGroupItem, ToggleGroupRoot } from '../index';

// Minimal declarative config wrapper (the package ships no ConfigProvider
// component; config is provided via `provideConfig` inside a setup).
const ConfigProvider = defineComponent({
  props: { dir: { type: String, default: undefined } },
  setup(props, { slots }) {
    provideConfig({ dir: () => props.dir as 'ltr' | 'rtl' | undefined });
    return () => slots.default?.();
  },
});

type AnyVal = unknown;

function press(el: Element, key: string, init: KeyboardEventInit = {}): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
}

const mounted: Array<{ unmount: () => void }> = [];
afterEach(() => {
  while (mounted.length) mounted.pop()!.unmount();
});

function mountGroup(opts: Record<string, unknown> = {}, items?: Array<Record<string, unknown>>) {
  const { modelValue: initial, ...rootProps } = opts;
  const model = ref<AnyVal>(initial);
  const list = items ?? [
    { value: 'a', id: 'a' },
    { value: 'b', id: 'b' },
    { value: 'c', id: 'c', disabled: true },
    { value: 'd', id: 'd' },
  ];
  const Harness = defineComponent({
    setup: () => () => h(ToggleGroupRoot, {
      modelValue: model.value,
      'onUpdate:modelValue': (v: AnyVal) => { model.value = v; },
      ...rootProps,
    }, {
      default: () => list.map(p => h(ToggleGroupItem, p, { default: () => String(p.value) })),
    }),
  });
  const wrapper = mount(Harness, { attachTo: document.body });
  mounted.push(wrapper);
  return { wrapper, model };
}

describe('ToggleGroup — type inference', () => {
  it('infers multiple when defaultValue is an array', async () => {
    const { wrapper } = mountGroup({ defaultValue: ['a'] });
    await nextTick();
    expect(wrapper.element.getAttribute('role')).toBe('group');
    expect(document.querySelector('#a')!.getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('#a')!.getAttribute('role')).toBeNull();
  });

  it('infers single when defaultValue is a scalar', async () => {
    const { wrapper } = mountGroup({ defaultValue: 'a' });
    await nextTick();
    expect(wrapper.element.getAttribute('role')).toBe('radiogroup');
    expect(document.querySelector('#a')!.getAttribute('role')).toBe('radio');
  });

  it('infers multiple from an array modelValue', async () => {
    const { wrapper } = mountGroup({ modelValue: ['a', 'b'] });
    await nextTick();
    expect(wrapper.element.getAttribute('role')).toBe('group');
  });

  it('explicit type wins and warns on conflict (dev)', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { wrapper } = mountGroup({ type: 'single', defaultValue: ['a'] });
    await nextTick();
    // Explicit type honored despite array value.
    expect(wrapper.element.getAttribute('role')).toBe('radiogroup');
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0]![0]).toContain('ToggleGroup');
    spy.mockRestore();
  });
});

describe('ToggleGroup — deep equality values', () => {
  it('toggles number values via deep equality', async () => {
    const { model } = mountGroup({ type: 'single' }, [
      { value: 1, id: 'n1' },
      { value: 2, id: 'n2' },
    ]);
    await nextTick();
    const n1 = document.querySelector<HTMLButtonElement>('#n1')!;
    n1.click();
    await nextTick();
    expect(model.value).toBe(1);
    expect(n1.getAttribute('aria-checked')).toBe('true');
    n1.click();
    await nextTick();
    expect(model.value).toBeUndefined();
  });

  it('toggles object values structurally (multiple)', async () => {
    const v1 = { k: 1 };
    const v2 = { k: 2 };
    const { model } = mountGroup({ type: 'multiple', modelValue: [] }, [
      { value: v1, id: 'o1' },
      { value: v2, id: 'o2' },
    ]);
    await nextTick();
    const o1 = document.querySelector<HTMLButtonElement>('#o1')!;
    o1.click();
    await nextTick();
    expect(model.value).toEqual([{ k: 1 }]);
    expect(o1.getAttribute('aria-pressed')).toBe('true');
    // Toggling off the same structural value removes it.
    o1.click();
    await nextTick();
    expect(model.value).toEqual([]);
  });
});

describe('ToggleGroup — controlled reset', () => {
  it('external reset to undefined clears the pressed value', async () => {
    const { wrapper, model } = mountGroup({ type: 'single', modelValue: 'a' });
    await nextTick();
    expect(document.querySelector('#a')!.getAttribute('aria-checked')).toBe('true');
    model.value = undefined;
    await wrapper.vm.$nextTick();
    await nextTick();
    expect(document.querySelector('#a')!.getAttribute('aria-checked')).toBe('false');
  });
});

describe('ToggleGroup — keyboard extensions', () => {
  it('PageUp jumps to first enabled, PageDown to last enabled', async () => {
    mountGroup();
    await nextTick();
    const a = document.querySelector<HTMLButtonElement>('#a')!;
    const b = document.querySelector<HTMLButtonElement>('#b')!;
    const d = document.querySelector<HTMLButtonElement>('#d')!;
    b.focus();
    press(b, 'PageUp');
    await nextTick();
    expect(document.activeElement).toBe(a);
    press(a, 'PageDown');
    await nextTick();
    expect(document.activeElement).toBe(d);
  });

  it('modifier-key chords do not move focus', async () => {
    mountGroup();
    await nextTick();
    const a = document.querySelector<HTMLButtonElement>('#a')!;
    a.focus();
    press(a, 'ArrowRight', { ctrlKey: true });
    await nextTick();
    expect(document.activeElement).toBe(a);
    press(a, 'ArrowRight', { metaKey: true });
    await nextTick();
    expect(document.activeElement).toBe(a);
    press(a, 'ArrowRight', { altKey: true });
    await nextTick();
    expect(document.activeElement).toBe(a);
  });

  it('rovingFocus=false disables arrow navigation', async () => {
    mountGroup({ rovingFocus: false });
    await nextTick();
    const a = document.querySelector<HTMLButtonElement>('#a')!;
    a.focus();
    press(a, 'ArrowRight');
    await nextTick();
    expect(document.activeElement).toBe(a);
  });
});

describe('ToggleGroup — non-button host activation', () => {
  it('Space/Enter toggle a non-button item', async () => {
    const { model } = mountGroup({ type: 'single' }, [
      { value: 'a', id: 'a', as: 'div' },
      { value: 'b', id: 'b', as: 'div' },
    ]);
    await nextTick();
    const a = document.querySelector<HTMLElement>('#a')!;
    a.focus();
    press(a, ' ');
    await nextTick();
    expect(model.value).toBe('a');
    const b = document.querySelector<HTMLElement>('#b')!;
    b.focus();
    press(b, 'Enter');
    await nextTick();
    expect(model.value).toBe('b');
  });
});

describe('ToggleGroup — mousedown focus', () => {
  it('focuses the item on mousedown', async () => {
    mountGroup();
    await nextTick();
    const b = document.querySelector<HTMLButtonElement>('#b')!;
    b.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    await nextTick();
    expect(document.activeElement).toBe(b);
  });

  it('does not focus a disabled item on mousedown', async () => {
    mountGroup();
    await nextTick();
    const a = document.querySelector<HTMLButtonElement>('#a')!;
    a.focus();
    const c = document.querySelector<HTMLButtonElement>('#c')!;
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    c.dispatchEvent(event);
    await nextTick();
    expect(document.activeElement).not.toBe(c);
    expect(event.defaultPrevented).toBe(true);
  });
});

describe('ToggleGroup — direction inheritance', () => {
  it('inherits rtl from ConfigProvider (ArrowRight goes backwards)', async () => {
    const model = ref<AnyVal>(undefined);
    const Harness = defineComponent({
      setup: () => () => h(ConfigProvider, { dir: 'rtl' }, {
        default: () => h(ToggleGroupRoot, {
          modelValue: model.value,
          'onUpdate:modelValue': (v: AnyVal) => { model.value = v; },
        }, {
          default: () => [
            h(ToggleGroupItem, { value: 'a', id: 'a' }, { default: () => 'A' }),
            h(ToggleGroupItem, { value: 'b', id: 'b' }, { default: () => 'B' }),
          ],
        }),
      }),
    });
    const wrapper = mount(Harness, { attachTo: document.body });
    mounted.push(wrapper);
    await nextTick();
    const a = document.querySelector<HTMLButtonElement>('#a')!;
    const b = document.querySelector<HTMLButtonElement>('#b')!;
    expect(wrapper.find('[role="radiogroup"]').attributes('dir')).toBe('rtl');
    b.focus();
    // In rtl, ArrowRight moves toward the start (b -> a).
    press(b, 'ArrowRight');
    await nextTick();
    expect(document.activeElement).toBe(a);
  });

  it('per-component dir prop overrides ConfigProvider', async () => {
    const model = ref<AnyVal>(undefined);
    const Harness = defineComponent({
      setup: () => () => h(ConfigProvider, { dir: 'rtl' }, {
        default: () => h(ToggleGroupRoot, {
          dir: 'ltr',
          modelValue: model.value,
          'onUpdate:modelValue': (v: AnyVal) => { model.value = v; },
        }, {
          default: () => [h(ToggleGroupItem, { value: 'a', id: 'a' }, { default: () => 'A' })],
        }),
      }),
    });
    const wrapper = mount(Harness, { attachTo: document.body });
    mounted.push(wrapper);
    await nextTick();
    expect(wrapper.find('[role="radiogroup"]').attributes('dir')).toBe('ltr');
  });
});

describe('ToggleGroup — form integration', () => {
  it('renders a hidden input inside a form (single)', async () => {
    const model = ref<AnyVal>('a');
    const Harness = defineComponent({
      setup: () => () => h('form', {}, [
        h(ToggleGroupRoot, {
          type: 'single',
          name: 'align',
          modelValue: model.value,
          'onUpdate:modelValue': (v: AnyVal) => { model.value = v; },
        }, {
          default: () => [
            h(ToggleGroupItem, { value: 'a', id: 'a' }, { default: () => 'A' }),
            h(ToggleGroupItem, { value: 'b', id: 'b' }, { default: () => 'B' }),
          ],
        }),
      ]),
    });
    const wrapper = mount(Harness, { attachTo: document.body });
    mounted.push(wrapper);
    await nextTick();
    const hidden = document.querySelector<HTMLInputElement>('form input[name="align"]');
    expect(hidden).not.toBeNull();
    expect(hidden!.value).toBe('a');
  });

  it('encodes array names for multiple', async () => {
    const model = ref<AnyVal>(['a', 'b']);
    const Harness = defineComponent({
      setup: () => () => h('form', {}, [
        h(ToggleGroupRoot, {
          type: 'multiple',
          name: 'marks',
          modelValue: model.value,
          'onUpdate:modelValue': (v: AnyVal) => { model.value = v; },
        }, {
          default: () => [
            h(ToggleGroupItem, { value: 'a', id: 'a' }, { default: () => 'A' }),
            h(ToggleGroupItem, { value: 'b', id: 'b' }, { default: () => 'B' }),
          ],
        }),
      ]),
    });
    const wrapper = mount(Harness, { attachTo: document.body });
    mounted.push(wrapper);
    await nextTick();
    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('form input[name^="marks"]'));
    const names = inputs.map(i => i.getAttribute('name')).sort();
    expect(names).toEqual(['marks[0]', 'marks[1]']);
    expect(inputs.map(i => i.value).sort()).toEqual(['a', 'b']);
  });

  it('does not render a hidden input without a name', async () => {
    mountGroup({ type: 'single', defaultValue: 'a' });
    await nextTick();
    expect(document.querySelector('input[type="hidden"]')).toBeNull();
  });
});
