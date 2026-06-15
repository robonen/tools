import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
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

  describe('disabled items', () => {
    function mountWithDisabled(disabled: boolean[], opts: { loop?: boolean } = {}) {
      const Harness = defineComponent({
        setup: () => () => h(ToolbarRoot, opts, {
          default: () => disabled.map((d, i) =>
            h(ToolbarButton, { id: `b${i + 1}`, disabled: d }, { default: () => `Item ${i + 1}` }),
          ),
        }),
      });
      return mount(Harness, { attachTo: document.body });
    }

    it('arrow navigation skips a disabled last item and wraps to the first enabled one', async () => {
      const w = mountWithDisabled([false, false, true]);
      await nextTick();
      const btns = document.querySelectorAll<HTMLElement>('button');
      btns[1]!.focus();
      press(btns[1]!, 'ArrowRight');
      await nextTick();
      expect(document.activeElement).toBe(btns[0]);
      w.unmount();
    });

    it('ArrowLeft from the first item wraps past a disabled last item', async () => {
      const w = mountWithDisabled([false, false, true]);
      await nextTick();
      const btns = document.querySelectorAll<HTMLElement>('button');
      btns[0]!.focus();
      press(btns[0]!, 'ArrowLeft');
      await nextTick();
      expect(document.activeElement).toBe(btns[1]);
      w.unmount();
    });

    it('End jumps to the last enabled item and keeps the tab stop on it', async () => {
      const w = mountWithDisabled([false, false, true]);
      await nextTick();
      const btns = document.querySelectorAll<HTMLElement>('button');
      btns[0]!.focus();
      press(btns[0]!, 'End');
      await nextTick();
      expect(document.activeElement).toBe(btns[1]);
      expect(btns[0]!.tabIndex).toBe(-1);
      expect(btns[1]!.tabIndex).toBe(0);
      expect(btns[2]!.tabIndex).toBe(-1);
      w.unmount();
    });

    it('loop=false clamps at the last enabled item, not the disabled one', async () => {
      const w = mountWithDisabled([false, false, true], { loop: false });
      await nextTick();
      const btns = document.querySelectorAll<HTMLElement>('button');
      btns[1]!.focus();
      press(btns[1]!, 'ArrowRight');
      await nextTick();
      expect(document.activeElement).toBe(btns[1]);
      expect(btns[1]!.tabIndex).toBe(0);
      w.unmount();
    });

    it('first enabled item carries the tab stop when item 0 is disabled', async () => {
      const w = mountWithDisabled([true, false, false]);
      await nextTick();
      const btns = document.querySelectorAll<HTMLElement>('button');
      expect(btns[0]!.tabIndex).toBe(-1);
      expect(btns[1]!.tabIndex).toBe(0);
      expect(btns[2]!.tabIndex).toBe(-1);
      w.unmount();
    });
  });

  describe('separator orientation reactivity', () => {
    it('inherited orientation follows toolbar orientation changes', async () => {
      const orientation = ref<'horizontal' | 'vertical'>('horizontal');
      const Harness = defineComponent({
        setup: () => () => h(ToolbarRoot, { orientation: orientation.value }, {
          default: () => [
            h(ToolbarButton, { id: 'b1' }, { default: () => 'One' }),
            h(ToolbarSeparator),
            h(ToolbarButton, { id: 'b2' }, { default: () => 'Two' }),
          ],
        }),
      });
      const w = mount(Harness, { attachTo: document.body });
      const sep = document.querySelector<HTMLElement>('[role="separator"]')!;
      expect(sep.getAttribute('aria-orientation')).toBe('vertical');
      orientation.value = 'vertical';
      await nextTick();
      expect(sep.getAttribute('aria-orientation')).toBe('horizontal');
      expect(sep.getAttribute('data-orientation')).toBe('horizontal');
      w.unmount();
    });

    it('explicit orientation prop updates reactively', async () => {
      const sepOrientation = ref<'horizontal' | 'vertical' | undefined>(undefined);
      const Harness = defineComponent({
        setup: () => () => h(ToolbarRoot, {}, {
          default: () => [
            h(ToolbarButton, { id: 'b1' }, { default: () => 'One' }),
            h(ToolbarSeparator, { orientation: sepOrientation.value }),
            h(ToolbarButton, { id: 'b2' }, { default: () => 'Two' }),
          ],
        }),
      });
      const w = mount(Harness, { attachTo: document.body });
      const sep = document.querySelector<HTMLElement>('[role="separator"]')!;
      expect(sep.getAttribute('aria-orientation')).toBe('vertical');
      sepOrientation.value = 'horizontal';
      await nextTick();
      expect(sep.getAttribute('aria-orientation')).toBe('horizontal');
      w.unmount();
    });
  });
});
