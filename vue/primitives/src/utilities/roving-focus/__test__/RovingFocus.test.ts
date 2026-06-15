import type { VueWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';

import RovingFocusGroup from '../RovingFocusGroup.vue';
import RovingFocusItem from '../RovingFocusItem.vue';

const wrappers: Array<VueWrapper<any>> = [];

afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
});

function track<T extends VueWrapper<any>>(w: T): T {
  wrappers.push(w);
  return w;
}

interface ItemSpec {
  id: string;
  disabled?: boolean;
  active?: boolean;
  highlighted?: boolean;
}

function renderItem(spec: ItemSpec) {
  return h(
    RovingFocusItem,
    {
      as: 'button',
      tabStopId: spec.id,
      id: spec.id,
      focusable: !spec.disabled,
      active: spec.active,
      'data-highlighted': spec.highlighted ? '' : undefined,
    },
    { default: () => spec.id },
  );
}

function makeGroup(
  items: ItemSpec[],
  groupProps: Record<string, unknown> = {},
) {
  return defineComponent({
    setup() {
      return () =>
        h(
          RovingFocusGroup,
          { ...groupProps },
          { default: () => items.map(renderItem) },
        );
    },
  });
}

function press(el: Element, key: string, init: KeyboardEventInit = {}) {
  el.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
  );
}

const ITEMS: ItemSpec[] = [
  { id: 'one' },
  { id: 'two' },
  { id: 'three', disabled: true },
  { id: 'four' },
];

describe('rovingFocus — ARIA / tab-order skeleton', () => {
  it('keeps a single tab stop: current item tabindex=0, the rest -1', async () => {
    const wrapper = track(
      mount(makeGroup(ITEMS, { defaultCurrentTabStopId: 'one' }), {
        attachTo: document.body,
      }),
    );
    await nextTick();
    const buttons = wrapper.findAll('button');
    expect(buttons[0]!.attributes('tabindex')).toBe('0');
    expect(buttons[1]!.attributes('tabindex')).toBe('-1');
    expect(buttons[3]!.attributes('tabindex')).toBe('-1');
  });

  it('marks active items with data-active and disabled with data-disabled', async () => {
    const wrapper = track(
      mount(
        makeGroup([
          { id: 'one', active: true },
          { id: 'two', disabled: true },
        ]),
        { attachTo: document.body },
      ),
    );
    await nextTick();
    const buttons = wrapper.findAll('button');
    expect(buttons[0]!.attributes('data-active')).toBe('');
    expect(buttons[1]!.attributes('data-active')).toBeUndefined();
    expect(buttons[1]!.attributes('data-disabled')).toBe('');
  });

  it('reflects orientation onto the group container', async () => {
    const wrapper = track(
      mount(makeGroup(ITEMS, { orientation: 'vertical' }), {
        attachTo: document.body,
      }),
    );
    await nextTick();
    expect(wrapper.find('[data-orientation="vertical"]').exists()).toBe(true);
  });
});

describe('rovingFocus — uncontrolled (defaultCurrentTabStopId)', () => {
  it('seeds the current tab stop from defaultCurrentTabStopId', async () => {
    const wrapper = track(
      mount(makeGroup(ITEMS, { defaultCurrentTabStopId: 'two' }), {
        attachTo: document.body,
      }),
    );
    await nextTick();
    const buttons = wrapper.findAll('button');
    expect(buttons[1]!.attributes('tabindex')).toBe('0');
    expect(buttons[0]!.attributes('tabindex')).toBe('-1');
  });

  it('updates the current tab stop on item focus without external binding', async () => {
    const wrapper = track(
      mount(makeGroup(ITEMS, { defaultCurrentTabStopId: 'one' }), {
        attachTo: document.body,
      }),
    );
    await nextTick();
    const buttons = wrapper.findAll('button');
    buttons[1]!.element.dispatchEvent(new FocusEvent('focus', { bubbles: false }));
    await nextTick();
    expect(buttons[1]!.attributes('tabindex')).toBe('0');
    expect(buttons[0]!.attributes('tabindex')).toBe('-1');
  });
});

describe('rovingFocus — controlled (v-model:currentTabStopId)', () => {
  it('respects an externally controlled currentTabStopId prop and re-syncs on change', async () => {
    const wrapper = track(
      mount(RovingFocusGroup, {
        attachTo: document.body,
        props: { currentTabStopId: 'four' },
        slots: { default: () => ITEMS.map(renderItem) },
      }),
    );
    await nextTick();
    const buttons = wrapper.findAll('button');
    expect(buttons[3]!.attributes('tabindex')).toBe('0');

    // Pushing a new controlled value re-syncs the tab stop (no internal-state race).
    await wrapper.setProps({ currentTabStopId: 'one' });
    await nextTick();
    expect(buttons[0]!.attributes('tabindex')).toBe('0');
    expect(buttons[3]!.attributes('tabindex')).toBe('-1');
  });

  it('emits update:currentTabStopId when an item gains focus', async () => {
    const onUpdate = vi.fn();
    const wrapper = track(
      mount(RovingFocusGroup, {
        attachTo: document.body,
        props: {
          currentTabStopId: 'one',
          'onUpdate:currentTabStopId': onUpdate,
        },
        slots: { default: () => ITEMS.map(renderItem) },
      }),
    );
    await nextTick();
    const buttons = wrapper.findAll('button');
    buttons[1]!.element.dispatchEvent(new FocusEvent('focus', { bubbles: false }));
    await nextTick();
    expect(onUpdate).toHaveBeenCalledWith('two');
  });
});

describe('rovingFocus — keyboard navigation', () => {
  it('[loop=false] moves to next, skips disabled, and stops at the last item', async () => {
    const wrapper = track(
      mount(makeGroup(ITEMS, { defaultCurrentTabStopId: 'two' }), {
        attachTo: document.body,
      }),
    );
    await nextTick();
    const buttons = wrapper.findAll('button');
    buttons[1]!.element.focus();

    press(buttons[1]!.element, 'ArrowRight');
    await nextTick();
    // index 2 is disabled, so focus lands on index 3
    expect(document.activeElement).toBe(buttons[3]!.element);

    press(buttons[3]!.element, 'ArrowRight');
    await nextTick();
    // loop=false: stay at the last item
    expect(document.activeElement).toBe(buttons[3]!.element);
  });

  it('[loop=true] wraps around past the last item, skipping disabled', async () => {
    const wrapper = track(
      mount(makeGroup(ITEMS, { defaultCurrentTabStopId: 'two', loop: true }), {
        attachTo: document.body,
      }),
    );
    await nextTick();
    const buttons = wrapper.findAll('button');
    buttons[1]!.element.focus();

    press(buttons[1]!.element, 'ArrowRight');
    await nextTick();
    expect(document.activeElement).toBe(buttons[3]!.element);

    press(buttons[3]!.element, 'ArrowRight');
    await nextTick();
    // wraps to first enabled item
    expect(document.activeElement).toBe(buttons[0]!.element);
  });

  it('Home / End jump to first and last enabled items', async () => {
    const wrapper = track(
      mount(makeGroup(ITEMS, { defaultCurrentTabStopId: 'two' }), {
        attachTo: document.body,
      }),
    );
    await nextTick();
    const buttons = wrapper.findAll('button');
    buttons[1]!.element.focus();

    press(buttons[1]!.element, 'End');
    await nextTick();
    expect(document.activeElement).toBe(buttons[3]!.element);

    press(buttons[3]!.element, 'Home');
    await nextTick();
    expect(document.activeElement).toBe(buttons[0]!.element);
  });

  it('does not navigate on the orientation-incompatible arrow key', async () => {
    const wrapper = track(
      mount(
        makeGroup(ITEMS, { orientation: 'horizontal', defaultCurrentTabStopId: 'one' }),
        { attachTo: document.body },
      ),
    );
    await nextTick();
    const buttons = wrapper.findAll('button');
    buttons[0]!.element.focus();

    press(buttons[0]!.element, 'ArrowDown');
    await nextTick();
    // vertical arrow ignored in horizontal orientation
    expect(document.activeElement).toBe(buttons[0]!.element);
  });

  it('respects RTL by swapping ArrowLeft / ArrowRight', async () => {
    const wrapper = track(
      mount(
        makeGroup(ITEMS, {
          orientation: 'horizontal',
          dir: 'rtl',
          defaultCurrentTabStopId: 'two',
        }),
        { attachTo: document.body },
      ),
    );
    await nextTick();
    const buttons = wrapper.findAll('button');
    buttons[1]!.element.focus();

    // In RTL, ArrowLeft means "next"
    press(buttons[1]!.element, 'ArrowLeft');
    await nextTick();
    expect(document.activeElement).toBe(buttons[3]!.element);
  });

  it('ignores arrow navigation when a modifier (ctrl) is held', async () => {
    const wrapper = track(
      mount(makeGroup(ITEMS, { defaultCurrentTabStopId: 'one' }), {
        attachTo: document.body,
      }),
    );
    await nextTick();
    const buttons = wrapper.findAll('button');
    buttons[0]!.element.focus();

    press(buttons[0]!.element, 'ArrowRight', { ctrlKey: true });
    await nextTick();
    expect(document.activeElement).toBe(buttons[0]!.element);
  });
});

describe('rovingFocus — disabled items', () => {
  it('does not register a non-focusable item as a tab-order participant', async () => {
    const wrapper = track(
      mount(
        makeGroup([
          { id: 'one', disabled: true },
          { id: 'two' },
        ]),
        { attachTo: document.body },
      ),
    );
    await nextTick();
    const buttons = wrapper.findAll('button');
    // disabled item carries data-disabled and is never the navigation target
    expect(buttons[0]!.attributes('data-disabled')).toBe('');
    buttons[1]!.element.focus();
    press(buttons[1]!.element, 'Home');
    await nextTick();
    expect(document.activeElement).toBe(buttons[1]!.element);
  });
});

describe('rovingFocus — entry focus priority', () => {
  it('prioritises the highlighted item over the current tab stop on entry', async () => {
    const wrapper = track(
      mount(
        makeGroup(
          [
            { id: 'one' },
            { id: 'two', highlighted: true },
            { id: 'four' },
          ],
          { defaultCurrentTabStopId: 'one' },
        ),
        { attachTo: document.body },
      ),
    );
    await nextTick();
    const groupEl = wrapper.find('button')!.element.closest('[style]') as HTMLElement;
    // Dispatch a keyboard-driven focus onto the group container.
    groupEl.dispatchEvent(new FocusEvent('focus', { bubbles: false }));
    await nextTick();
    const buttons = wrapper.findAll('button');
    // highlighted item ('two') wins entry focus over current tab stop ('one')
    expect(document.activeElement).toBe(buttons[1]!.element);
  });

  it('falls back to the active item when nothing is highlighted', async () => {
    const wrapper = track(
      mount(
        makeGroup([
          { id: 'one' },
          { id: 'two', active: true },
          { id: 'four' },
        ]),
        { attachTo: document.body },
      ),
    );
    await nextTick();
    const groupEl = wrapper.find('button')!.element.closest('[style]') as HTMLElement;
    groupEl.dispatchEvent(new FocusEvent('focus', { bubbles: false }));
    await nextTick();
    const buttons = wrapper.findAll('button');
    expect(document.activeElement).toBe(buttons[1]!.element);
  });
});

describe('rovingFocus — Tab back out', () => {
  it('marks the group tabindex=-1 after Shift+Tab from an item', async () => {
    const wrapper = track(
      mount(makeGroup(ITEMS, { defaultCurrentTabStopId: 'one' }), {
        attachTo: document.body,
      }),
    );
    await nextTick();
    const buttons = wrapper.findAll('button');
    const groupEl = buttons[0]!.element.closest('[style]') as HTMLElement;
    expect(groupEl.getAttribute('tabindex')).toBe('0');

    press(buttons[0]!.element, 'Tab', { shiftKey: true });
    await nextTick();
    expect(groupEl.getAttribute('tabindex')).toBe('-1');
  });
});
