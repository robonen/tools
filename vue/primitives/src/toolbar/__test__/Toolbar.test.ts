import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { ToolbarButton, ToolbarRoot, ToolbarSeparator } from '../index';

function mountToolbar(opts: { orientation?: 'horizontal' | 'vertical'; dir?: 'ltr' | 'rtl'; loop?: boolean } = {}) {
  const Harness = defineComponent({
    setup: () => () => h(ToolbarRoot, opts, {
      default: () => [
        h(ToolbarButton, { id: 'b1' }, { default: () => 'One' }),
        h(ToolbarButton, { id: 'b2' }, { default: () => 'Two' }),
        h(ToolbarSeparator),
        h(ToolbarButton, { id: 'b3' }, { default: () => 'Three' }),
      ],
    }),
  });
  return mount(Harness, { attachTo: document.body });
}

function press(el: Element, key: string): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

describe('Toolbar', () => {
  it('renders role="toolbar" with aria-orientation', () => {
    const w = mountToolbar();
    const root = w.element as HTMLElement;
    expect(root.getAttribute('role')).toBe('toolbar');
    expect(root.getAttribute('aria-orientation')).toBe('horizontal');
    w.unmount();
  });

  it('first item has tabindex 0, rest -1', async () => {
    const w = mountToolbar();
    await nextTick();
    const btns = document.querySelectorAll<HTMLElement>('button');
    expect(btns[0]!.tabIndex).toBe(0);
    expect(btns[1]!.tabIndex).toBe(-1);
    expect(btns[2]!.tabIndex).toBe(-1);
    w.unmount();
  });

  it('ArrowRight moves focus forward; wraps', async () => {
    const w = mountToolbar();
    await nextTick();
    const btns = document.querySelectorAll<HTMLElement>('button');
    btns[0]!.focus();
    press(btns[0]!, 'ArrowRight');
    await nextTick();
    expect(document.activeElement).toBe(btns[1]);
    press(btns[1]!, 'ArrowRight');
    await nextTick();
    expect(document.activeElement).toBe(btns[2]);
    press(btns[2]!, 'ArrowRight');
    await nextTick();
    expect(document.activeElement).toBe(btns[0]);
    w.unmount();
  });

  it('ArrowLeft reverses in RTL', async () => {
    const w = mountToolbar({ dir: 'rtl' });
    await nextTick();
    const btns = document.querySelectorAll<HTMLElement>('button');
    btns[0]!.focus();
    press(btns[0]!, 'ArrowLeft');
    await nextTick();
    expect(document.activeElement).toBe(btns[1]);
    w.unmount();
  });

  it('Home/End jump to first/last', async () => {
    const w = mountToolbar();
    await nextTick();
    const btns = document.querySelectorAll<HTMLElement>('button');
    btns[0]!.focus();
    press(btns[0]!, 'End');
    await nextTick();
    expect(document.activeElement).toBe(btns[2]);
    press(btns[2]!, 'Home');
    await nextTick();
    expect(document.activeElement).toBe(btns[0]);
    w.unmount();
  });

  it('separator has role=separator with inverse orientation', () => {
    const w = mountToolbar({ orientation: 'horizontal' });
    const sep = document.querySelector<HTMLElement>('[role="separator"]')!;
    expect(sep.getAttribute('aria-orientation')).toBe('vertical');
    w.unmount();
  });

  it('loop=false clamps at ends', async () => {
    const w = mountToolbar({ loop: false });
    await nextTick();
    const btns = document.querySelectorAll<HTMLElement>('button');
    btns[0]!.focus();
    press(btns[0]!, 'ArrowLeft');
    await nextTick();
    expect(document.activeElement).toBe(btns[0]);
    w.unmount();
  });
});
