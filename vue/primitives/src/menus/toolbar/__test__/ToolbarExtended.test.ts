import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import {
  ToolbarButton,
  ToolbarLink,
  ToolbarRoot,
  ToolbarSeparator,
  ToolbarToggleGroup,
  ToolbarToggleItem,
} from '../index';

function press(el: Element, key: string, init: KeyboardEventInit = {}): boolean {
  return el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
}

function mountButtons(opts: Record<string, unknown> = {}, count = 3) {
  const Harness = defineComponent({
    setup: () => () => h(ToolbarRoot, opts, {
      default: () => Array.from({ length: count }, (_, i) =>
        h(ToolbarButton, { id: `b${i + 1}` }, { default: () => `Item ${i + 1}` })),
    }),
  });
  return mount(Harness, { attachTo: document.body });
}

describe('Toolbar — group reachability', () => {
  it('group has tabindex 0 when at least one item is enabled', async () => {
    const w = mountButtons();
    await nextTick();
    expect((w.element as HTMLElement).getAttribute('tabindex')).toBe('0');
    w.unmount();
  });

  it('group falls back to tabindex 0 even if no items mounted yet', () => {
    const Harness = defineComponent({ setup: () => () => h(ToolbarRoot, {}, { default: () => [] }) });
    const w = mount(Harness, { attachTo: document.body });
    // No enabled items -> group itself carries the tab stop (-1 once empty).
    expect((w.element as HTMLElement).getAttribute('tabindex')).toBe('-1');
    w.unmount();
  });

  it('Shift+Tab on an item drops the group out of the tab order until blur', async () => {
    const w = mountButtons();
    await nextTick();
    const btns = document.querySelectorAll<HTMLElement>('button');
    btns[0]!.focus();
    press(btns[0]!, 'Tab', { shiftKey: true });
    await nextTick();
    expect((w.element as HTMLElement).getAttribute('tabindex')).toBe('-1');
    // blur on the group resets the tabbing-back-out flag
    (w.element as HTMLElement).dispatchEvent(new FocusEvent('blur'));
    await nextTick();
    expect((w.element as HTMLElement).getAttribute('tabindex')).toBe('0');
    w.unmount();
  });
});

describe('Toolbar — PageUp / PageDown', () => {
  it('PageDown jumps to last, PageUp to first', async () => {
    const w = mountButtons();
    await nextTick();
    const btns = document.querySelectorAll<HTMLElement>('button');
    btns[0]!.focus();
    press(btns[0]!, 'PageDown');
    await nextTick();
    expect(document.activeElement).toBe(btns[2]);
    press(btns[2]!, 'PageUp');
    await nextTick();
    expect(document.activeElement).toBe(btns[0]);
    w.unmount();
  });
});

describe('Toolbar — keyboard guards', () => {
  it('ignores arrow navigation when a modifier key is held', async () => {
    const w = mountButtons();
    await nextTick();
    const btns = document.querySelectorAll<HTMLElement>('button');
    btns[0]!.focus();
    const notPrevented = press(btns[0]!, 'ArrowRight', { ctrlKey: true });
    await nextTick();
    expect(document.activeElement).toBe(btns[0]);
    // event was not preventDefault'd, so the browser shortcut is left intact
    expect(notPrevented).toBe(true);
    w.unmount();
  });

  it('does not hijack keys originating from a nested element', async () => {
    const Harness = defineComponent({
      setup: () => () => h(ToolbarRoot, {}, {
        default: () => [
          h(ToolbarButton, { id: 'b1' }, { default: () => [h('input', { id: 'nested' })] }),
          h(ToolbarButton, { id: 'b2' }, { default: () => 'Two' }),
        ],
      }),
    });
    const w = mount(Harness, { attachTo: document.body });
    await nextTick();
    const input = document.getElementById('nested')!;
    const btns = document.querySelectorAll<HTMLElement>('button');
    btns[0]!.focus();
    // keydown bubbling from the nested input must not move roving focus
    press(input, 'ArrowRight');
    await nextTick();
    expect(document.activeElement).not.toBe(btns[1]);
    w.unmount();
  });
});

describe('Toolbar — entry focus', () => {
  it('focusing the group element redirects focus to the first item', async () => {
    const w = mountButtons();
    await nextTick();
    const root = w.element as HTMLElement;
    const btns = document.querySelectorAll<HTMLElement>('button');
    root.dispatchEvent(new FocusEvent('focus'));
    await nextTick();
    expect(document.activeElement).toBe(btns[0]);
    w.unmount();
  });

  it('entryFocus emit can preventDefault to keep focus on the group', async () => {
    const onEntry = vi.fn((e: Event) => e.preventDefault());
    const Harness = defineComponent({
      setup: () => () => h(ToolbarRoot, { onEntryFocus: onEntry }, {
        default: () => [h(ToolbarButton, { id: 'b1' }, { default: () => 'One' })],
      }),
    });
    const w = mount(Harness, { attachTo: document.body });
    await nextTick();
    const root = w.element as HTMLElement;
    const btn = document.querySelector<HTMLElement>('button')!;
    root.dispatchEvent(new FocusEvent('focus'));
    await nextTick();
    expect(onEntry).toHaveBeenCalled();
    expect(document.activeElement).not.toBe(btn);
    w.unmount();
  });
});

describe('Toolbar — currentTabStopId v-model', () => {
  it('emits update:currentTabStopId when focus moves between items', async () => {
    const current = ref<string | null>(null);
    const Harness = defineComponent({
      setup: () => () => h(ToolbarRoot, {
        currentTabStopId: current.value,
        'onUpdate:currentTabStopId': (v: string | null | undefined) => { current.value = v ?? null; },
      }, {
        default: () => [
          h(ToolbarButton, { id: 'b1' }, { default: () => 'One' }),
          h(ToolbarButton, { id: 'b2' }, { default: () => 'Two' }),
        ],
      }),
    });
    const w = mount(Harness, { attachTo: document.body });
    await nextTick();
    const btns = document.querySelectorAll<HTMLElement>('button');
    btns[0]!.focus();
    btns[0]!.dispatchEvent(new FocusEvent('focus'));
    await nextTick();
    expect(current.value).toBe('b1');
    btns[0]!.focus();
    press(btns[0]!, 'ArrowRight');
    await nextTick();
    expect(current.value).toBe('b2');
    w.unmount();
  });
});

describe('ToolbarSeparator — decorative', () => {
  it('decorative separator is removed from the a11y tree', () => {
    const Harness = defineComponent({
      setup: () => () => h(ToolbarRoot, {}, {
        default: () => [
          h(ToolbarButton, { id: 'b1' }, { default: () => 'One' }),
          h(ToolbarSeparator, { decorative: true }),
          h(ToolbarButton, { id: 'b2' }, { default: () => 'Two' }),
        ],
      }),
    });
    const w = mount(Harness, { attachTo: document.body });
    const sep = w.element.querySelector<HTMLElement>('[role="none"]');
    expect(sep).not.toBeNull();
    expect(sep!.getAttribute('aria-orientation')).toBeNull();
    expect(w.element.querySelector('[role="separator"]')).toBeNull();
    w.unmount();
  });
});

describe('ToolbarLink', () => {
  function mountWithLink() {
    const Harness = defineComponent({
      setup: () => () => h(ToolbarRoot, {}, {
        default: () => [
          h(ToolbarButton, { id: 'b1' }, { default: () => 'One' }),
          h(ToolbarLink, { id: 'l1', href: '#target' }, { default: () => 'Link' }),
        ],
      }),
    });
    return mount(Harness, { attachTo: document.body });
  }

  it('renders an anchor that participates in roving focus', async () => {
    const w = mountWithLink();
    await nextTick();
    const link = document.getElementById('l1')!;
    expect(link.tagName).toBe('A');
    const btn = document.querySelector<HTMLElement>('button')!;
    btn.focus();
    press(btn, 'ArrowRight');
    await nextTick();
    expect(document.activeElement).toBe(link);
    w.unmount();
  });

  it('Space triggers a click on the link', async () => {
    const w = mountWithLink();
    await nextTick();
    const link = document.getElementById('l1') as HTMLAnchorElement;
    const clicked = vi.fn();
    link.addEventListener('click', clicked);
    link.focus();
    press(link, ' ');
    await nextTick();
    expect(clicked).toHaveBeenCalled();
    w.unmount();
  });
});

describe('ToolbarToggleGroup / ToolbarToggleItem', () => {
  function mountToggles(props: Record<string, unknown> = {}) {
    const Harness = defineComponent({
      setup: () => () => h(ToolbarRoot, {}, {
        default: () => [
          h(ToolbarToggleGroup, { type: 'single', ...props }, {
            default: () => [
              h(ToolbarToggleItem, { value: 'left', id: 't-left' }, { default: () => 'L' }),
              h(ToolbarToggleItem, { value: 'center', id: 't-center' }, { default: () => 'C' }),
              h(ToolbarToggleItem, { value: 'right', id: 't-right' }, { default: () => 'R' }),
            ],
          }),
        ],
      }),
    });
    return mount(Harness, { attachTo: document.body });
  }

  it('toggle items render as buttons with toggle state', async () => {
    const w = mountToggles();
    await nextTick();
    const items = document.querySelectorAll<HTMLElement>('[id^="t-"]');
    expect(items.length).toBe(3);
    expect(items[0]!.tagName).toBe('BUTTON');
    expect(items[0]!.getAttribute('data-state')).toBe('off');
    items[0]!.click();
    await nextTick();
    expect(items[0]!.getAttribute('data-state')).toBe('on');
    // single mode: clicking another deselects the first
    items[1]!.click();
    await nextTick();
    expect(items[0]!.getAttribute('data-state')).toBe('off');
    expect(items[1]!.getAttribute('data-state')).toBe('on');
    w.unmount();
  });

  it('toggle items join the toolbar roving order (arrow keys move between them)', async () => {
    const w = mountToggles();
    await nextTick();
    const items = document.querySelectorAll<HTMLElement>('[id^="t-"]');
    items[0]!.focus();
    press(items[0]!, 'ArrowRight');
    await nextTick();
    expect(document.activeElement).toBe(items[1]);
    w.unmount();
  });

  it('multiple mode allows several pressed at once via v-model', async () => {
    const model = ref<string[]>([]);
    const Harness = defineComponent({
      setup: () => () => h(ToolbarRoot, {}, {
        default: () => [
          h(ToolbarToggleGroup, {
            type: 'multiple',
            modelValue: model.value,
            'onUpdate:modelValue': (v: string[]) => { model.value = v; },
          }, {
            default: () => [
              h(ToolbarToggleItem, { value: 'bold', id: 'm-bold' }, { default: () => 'B' }),
              h(ToolbarToggleItem, { value: 'italic', id: 'm-italic' }, { default: () => 'I' }),
            ],
          }),
        ],
      }),
    });
    const w = mount(Harness, { attachTo: document.body });
    await nextTick();
    document.getElementById('m-bold')!.click();
    await nextTick();
    document.getElementById('m-italic')!.click();
    await nextTick();
    expect(model.value).toEqual(['bold', 'italic']);
    w.unmount();
  });

  it('disabled toggle item is skipped by toolbar roving', async () => {
    const Harness = defineComponent({
      setup: () => () => h(ToolbarRoot, {}, {
        default: () => [
          h(ToolbarToggleGroup, { type: 'single' }, {
            default: () => [
              h(ToolbarToggleItem, { value: 'a', id: 'd-a' }, { default: () => 'A' }),
              h(ToolbarToggleItem, { value: 'b', id: 'd-b', disabled: true }, { default: () => 'B' }),
              h(ToolbarToggleItem, { value: 'c', id: 'd-c' }, { default: () => 'C' }),
            ],
          }),
        ],
      }),
    });
    const w = mount(Harness, { attachTo: document.body });
    await nextTick();
    const a = document.getElementById('d-a')!;
    const c = document.getElementById('d-c')!;
    a.focus();
    press(a, 'ArrowRight');
    await nextTick();
    expect(document.activeElement).toBe(c);
    w.unmount();
  });
});
