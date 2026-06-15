import type { VueWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';

import {
  MenuAnchor,
  MenuCheckboxItem,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuItemIndicator,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuRoot,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
} from '../index';

const wrappers: Array<VueWrapper<any>> = [];

afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
  document.body.style.pointerEvents = '';
});

function track<T extends VueWrapper<any>>(w: T): T {
  wrappers.push(w);
  return w;
}

// Writes back into a ref — keeps inline v-model handlers to a single statement.
function setter<T>(r: { value: T }): (v: T) => void {
  return (v: T) => {
    r.value = v;
  };
}

async function openMenu(open: { value: boolean }) {
  open.value = true;
  await nextTick();
  await nextTick();
}

function content(): HTMLElement {
  return document.querySelector<HTMLElement>('[role="menu"]')!;
}

function keydown(el: HTMLElement, key: string, init: KeyboardEventInit = {}) {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
}

function usePointer() {
  document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
}

function useKeyboard() {
  document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
}

describe('menu — Group / Label accessible name wiring', () => {
  it('points group aria-labelledby at the nested label id', async () => {
    const open = ref(false);
    const Harness = defineComponent({
      setup() {
        return () => h(MenuRoot, { open: open.value, 'onUpdate:open': setter(open) }, {
          default: () => [
            h(MenuAnchor, null, { default: () => h('button', 'Anchor') }),
            h(MenuContent, null, {
              default: () => h(MenuGroup, null, {
                default: () => [
                  h(MenuLabel, { class: 'lbl' }, { default: () => 'Section' }),
                  h(MenuItem, null, { default: () => 'Alpha' }),
                ],
              }),
            }),
          ],
        });
      },
    });
    track(mount(Harness, { attachTo: document.body }));
    await openMenu(open);

    const group = document.querySelector<HTMLElement>('[role="group"]')!;
    const label = document.querySelector<HTMLElement>('.lbl')!;
    expect(group.getAttribute('aria-labelledby')).toBeTruthy();
    expect(label.id).toBe(group.getAttribute('aria-labelledby'));
  });
});

describe('menu — keyboard: Tab is trapped inside content', () => {
  it('prevents default on Tab originating inside the content', async () => {
    const open = ref(false);
    const Harness = defineComponent({
      setup() {
        return () => h(MenuRoot, { open: open.value, 'onUpdate:open': setter(open) }, {
          default: () => [
            h(MenuAnchor, null, { default: () => h('button', 'Anchor') }),
            h(MenuContent, null, { default: () => h(MenuItem, null, { default: () => 'Alpha' }) }),
          ],
        });
      },
    });
    track(mount(Harness, { attachTo: document.body }));
    await openMenu(open);

    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    content().dispatchEvent(event);
    await nextTick();
    expect(event.defaultPrevented).toBe(true);
  });
});

describe('menu — keyboard: Space during typeahead does not select', () => {
  function mountTypeahead() {
    const open = ref(false);
    const selected: Event[] = [];
    const Harness = defineComponent({
      setup() {
        return () => h(MenuRoot, { open: open.value, 'onUpdate:open': setter(open) }, {
          default: () => [
            h(MenuAnchor, null, { default: () => h('button', 'Anchor') }),
            h(MenuContent, null, {
              default: () => [
                h(MenuItem, { onSelect: (e: Event) => selected.push(e) }, { default: () => 'Alpha' }),
                h(MenuItem, null, { default: () => 'Bravo' }),
              ],
            }),
          ],
        });
      },
    });
    track(mount(Harness, { attachTo: document.body }));
    return { open, selected };
  }

  it('Space selects when not searching', async () => {
    usePointer();
    const { open, selected } = mountTypeahead();
    await openMenu(open);
    const item = document.querySelector<HTMLElement>('[role="menuitem"]')!;
    item.focus();
    keydown(item, ' ');
    await nextTick();
    expect(selected).toHaveLength(1);
  });

  it('Space is swallowed (no select) while a typeahead search is active', async () => {
    usePointer();
    const { open, selected } = mountTypeahead();
    await openMenu(open);
    // Begin a search by typing a character on the content.
    keydown(content(), 'a');
    await nextTick();
    const item = document.querySelector<HTMLElement>('[role="menuitem"]')!;
    item.focus();
    keydown(item, ' ');
    await nextTick();
    expect(selected).toHaveLength(0);
    expect(open.value).toBe(true);
  });
});

describe('menu — MenuSub uncontrolled open + parent-close auto-dismiss', () => {
  function mountSub() {
    const open = ref(false);
    const Harness = defineComponent({
      setup() {
        return () => h(MenuRoot, { open: open.value, 'onUpdate:open': setter(open) }, {
          default: () => [
            h(MenuAnchor, null, { default: () => h('button', 'Anchor') }),
            h(MenuContent, null, {
              default: () => h(MenuSub, null, {
                // No v-model:open bound -> uncontrolled.
                default: () => [
                  h(MenuSubTrigger, { class: 'sub-trigger' }, { default: () => 'More' }),
                  h(MenuSubContent, null, { default: () => h(MenuItem, null, { default: () => 'Nested' }) }),
                ],
              }),
            }),
          ],
        });
      },
    });
    track(mount(Harness, { attachTo: document.body }));
    return { open };
  }

  it('opens the submenu without an external v-model (uncontrolled)', async () => {
    const { open } = mountSub();
    await openMenu(open);
    const trigger = document.querySelector<HTMLElement>('.sub-trigger')!;
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    await nextTick();
    expect(trigger.getAttribute('data-state')).toBe('open');
    expect(document.querySelectorAll('[role="menu"]').length).toBe(2);
  });

  it('closes the submenu when the parent menu closes', async () => {
    const { open } = mountSub();
    await openMenu(open);
    const trigger = document.querySelector<HTMLElement>('.sub-trigger')!;
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    await nextTick();
    expect(document.querySelectorAll('[role="menu"]').length).toBe(2);

    open.value = false;
    await nextTick();
    await nextTick();
    // Both the parent and the orphaned submenu are gone.
    expect(document.querySelectorAll('[role="menu"]').length).toBe(0);
  });

  it('reopening the parent does not reopen a previously open submenu', async () => {
    const { open } = mountSub();
    await openMenu(open);
    const trigger = document.querySelector<HTMLElement>('.sub-trigger')!;
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    await nextTick();
    expect(document.querySelectorAll('[role="menu"]').length).toBe(2);

    open.value = false;
    await nextTick();
    await nextTick();
    await openMenu(open);
    // Only the parent reopens.
    expect(document.querySelectorAll('[role="menu"]').length).toBe(1);
  });
});

describe('menu — submenu close key returns focus to the trigger', () => {
  function mountSub(dir?: 'ltr' | 'rtl') {
    const open = ref(false);
    const subOpen = ref(false);
    const Harness = defineComponent({
      setup() {
        return () => h(MenuRoot, { open: open.value, 'onUpdate:open': setter(open), dir }, {
          default: () => [
            h(MenuAnchor, null, { default: () => h('button', 'Anchor') }),
            h(MenuContent, null, {
              default: () => h(MenuSub, { open: subOpen.value, 'onUpdate:open': setter(subOpen) }, {
                default: () => [
                  h(MenuSubTrigger, { class: 'sub-trigger' }, { default: () => 'More' }),
                  h(MenuSubContent, null, { default: () => h(MenuItem, null, { default: () => 'Nested' }) }),
                ],
              }),
            }),
          ],
        });
      },
    });
    track(mount(Harness, { attachTo: document.body }));
    return { open, subOpen };
  }

  it('ArrowLeft inside an open submenu closes it and refocuses the trigger (ltr)', async () => {
    useKeyboard();
    const { open, subOpen } = mountSub('ltr');
    await openMenu(open);
    const trigger = document.querySelector<HTMLElement>('.sub-trigger')!;
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    await nextTick();
    expect(subOpen.value).toBe(true);

    const subContent = document.querySelectorAll<HTMLElement>('[role="menu"]')[1]!;
    keydown(subContent, 'ArrowLeft');
    await nextTick();
    await nextTick();

    expect(subOpen.value).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });
});

describe('menu — submenu pointer grace area', () => {
  function mountSub() {
    const open = ref(false);
    const subOpen = ref(false);
    const Harness = defineComponent({
      setup() {
        return () => h(MenuRoot, { open: open.value, 'onUpdate:open': setter(open) }, {
          default: () => [
            h(MenuAnchor, null, { default: () => h('button', 'Anchor') }),
            h(MenuContent, { style: 'width:200px' }, {
              default: () => [
                h(MenuSub, { open: subOpen.value, 'onUpdate:open': setter(subOpen) }, {
                  default: () => [
                    h(MenuSubTrigger, { class: 'sub-trigger' }, { default: () => 'More' }),
                    h(MenuSubContent, { style: 'width:150px;height:80px' }, {
                      default: () => h(MenuItem, null, { default: () => 'Nested' }),
                    }),
                  ],
                }),
                h(MenuItem, { class: 'sibling' }, { default: () => 'Sibling' }),
              ],
            }),
          ],
        });
      },
    });
    track(mount(Harness, { attachTo: document.body }));
    return { open, subOpen };
  }

  function pointerMove(el: HTMLElement, x: number, y: number) {
    el.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse', clientX: x, clientY: y }));
  }

  it('keeps focus from being stolen by a sibling while the pointer travels toward the open submenu', async () => {
    const { open, subOpen } = mountSub();
    await openMenu(open);

    const trigger = document.querySelector<HTMLElement>('.sub-trigger')!;
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    await nextTick();
    expect(subOpen.value).toBe(true);

    const subContent = document.querySelectorAll<HTMLElement>('[role="menu"]')[1]!;
    const subRect = subContent.getBoundingClientRect();
    const parentContent = content();
    const triggerRect = trigger.getBoundingClientRect();

    // Establish rightward pointer direction on the parent content.
    pointerMove(parentContent, triggerRect.left + 1, triggerRect.top + 5);
    pointerMove(parentContent, triggerRect.left + 10, triggerRect.top + 5);

    // Leave the trigger heading toward the submenu -> registers a grace area.
    trigger.dispatchEvent(new PointerEvent('pointerleave', {
      bubbles: true,
      pointerType: 'mouse',
      clientX: triggerRect.right,
      clientY: triggerRect.top + 5,
    }));
    await nextTick();

    // A pointermove over the sibling, but inside the grace triangle (between
    // the trigger and the submenu, moving right), must NOT focus the sibling.
    const sibling = document.querySelector<HTMLElement>('.sibling')!;
    const insideGraceX = (triggerRect.right + subRect.left) / 2;
    const insideGraceY = subRect.top + 2;
    sibling.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true,
      pointerType: 'mouse',
      clientX: insideGraceX,
      clientY: insideGraceY,
    }));
    await nextTick();

    // The grace area suppressed the sibling's focus steal mid-transit.
    expect(document.activeElement).not.toBe(sibling);
  });

  it('focuses a sibling normally when moving away from the submenu (no grace match)', async () => {
    const { open, subOpen } = mountSub();
    await openMenu(open);

    const trigger = document.querySelector<HTMLElement>('.sub-trigger')!;
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    await nextTick();
    expect(subOpen.value).toBe(true);

    const parentContent = content();
    const triggerRect = trigger.getBoundingClientRect();

    // Establish *leftward* pointer direction (away from the right-side submenu).
    pointerMove(parentContent, triggerRect.left + 20, triggerRect.top + 5);
    pointerMove(parentContent, triggerRect.left + 5, triggerRect.top + 5);

    // No grace intent registered yet; a sibling pointermove should focus it.
    const sibling = document.querySelector<HTMLElement>('.sibling')!;
    const sibRect = sibling.getBoundingClientRect();
    sibling.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true,
      pointerType: 'mouse',
      clientX: sibRect.left + 2,
      clientY: sibRect.top + 2,
    }));
    await nextTick();

    expect(document.activeElement).toBe(sibling);
  });
});

describe('menu — checkbox / radio expose checked state via slot', () => {
  it('MenuCheckboxItem default slot receives the checked state', async () => {
    const open = ref(false);
    const seen: unknown[] = [];
    const Harness = defineComponent({
      setup() {
        return () => h(MenuRoot, { open: open.value, 'onUpdate:open': setter(open) }, {
          default: () => [
            h(MenuAnchor, null, { default: () => h('button', 'Anchor') }),
            h(MenuContent, null, {
              default: () => h(MenuCheckboxItem, { checked: true }, {
                default: (slotProps: { checked: unknown }) => {
                  seen.push(slotProps.checked);
                  return 'Toggle';
                },
              }),
            }),
          ],
        });
      },
    });
    track(mount(Harness, { attachTo: document.body }));
    await openMenu(open);
    expect(seen).toContain(true);
  });

  it('MenuRadioItem default slot receives whether it is checked', async () => {
    const open = ref(false);
    const seen: boolean[] = [];
    const Harness = defineComponent({
      setup() {
        return () => h(MenuRoot, { open: open.value, 'onUpdate:open': setter(open) }, {
          default: () => [
            h(MenuAnchor, null, { default: () => h('button', 'Anchor') }),
            h(MenuContent, null, {
              default: () => h(MenuRadioGroup, { modelValue: 'a' }, {
                default: () => [
                  h(MenuRadioItem, { value: 'a' }, {
                    default: (slotProps: { checked: boolean }) => {
                      seen.push(slotProps.checked);
                      return 'A';
                    },
                  }),
                  h(MenuRadioItem, { value: 'b' }, {
                    default: (slotProps: { checked: boolean }) => {
                      seen.push(slotProps.checked);
                      return 'B';
                    },
                  }),
                ],
              }),
            }),
          ],
        });
      },
    });
    track(mount(Harness, { attachTo: document.body }));
    await openMenu(open);
    expect(seen).toContain(true);
    expect(seen).toContain(false);
  });
});

describe('menu — radio group accepts non-string values and renders through a group', () => {
  it('selects by numeric value and exposes role=group with a labelledby hook', async () => {
    const open = ref(false);
    const model = ref<number | undefined>(undefined);
    const Harness = defineComponent({
      setup() {
        return () => h(MenuRoot, { open: open.value, 'onUpdate:open': setter(open) }, {
          default: () => [
            h(MenuAnchor, null, { default: () => h('button', 'Anchor') }),
            h(MenuContent, null, {
              default: () => h(MenuRadioGroup, {
                modelValue: model.value,
                'onUpdate:modelValue': setter(model),
              }, {
                default: () => [
                  h(MenuLabel, null, { default: () => 'Pick' }),
                  h(MenuRadioItem, { value: 1, class: 'r1', onSelect: (e: Event) => e.preventDefault() }, {
                    default: () => h(MenuItemIndicator, { class: 'ind' }, { default: () => '•' }),
                  }),
                  h(MenuRadioItem, { value: 2, class: 'r2' }, { default: () => 'Two' }),
                ],
              }),
            }),
          ],
        });
      },
    });
    track(mount(Harness, { attachTo: document.body }));
    await openMenu(open);

    const group = document.querySelector<HTMLElement>('[role="group"]')!;
    expect(group).toBeTruthy();
    expect(group.getAttribute('aria-labelledby')).toBeTruthy();

    const r1 = document.querySelector<HTMLElement>('[role="menuitemradio"].r1')!;
    expect(r1).toBeTruthy();
    r1.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    await nextTick();
    await nextTick();
    expect(model.value).toBe(1);
    expect(r1.getAttribute('aria-checked')).toBe('true');
  });
});
