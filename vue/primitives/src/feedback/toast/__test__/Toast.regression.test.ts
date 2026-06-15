// Regression tests for confirmed bugs from Phase 1 audit:
//   1. ToastRoot tabindex must be -1 (programmatic only), not 0 (conflicts with roving focus).
//   2. ToastViewport hotkey must validate against empty array (otherwise vacuous-truth
//      focuses the viewport on every keystroke).
//   3. ToastRoot must restart the auto-dismiss timer when `duration` changes reactively.

import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { ToastProvider, ToastRoot, ToastViewport } from '../index';

function createHarness(props: {
  duration?: number;
  hotkey?: string[];
} = {}) {
  return defineComponent({
    components: { ToastProvider, ToastViewport, ToastRoot },
    setup() {
      const duration = ref(props.duration);
      return { duration, hotkey: props.hotkey };
    },
    render() {
      return h(ToastProvider, {}, {
        default: () => [
          h(ToastViewport, { hotkey: this.hotkey ?? ['F8'] }),
          h(ToastRoot, { duration: this.duration }, { default: () => 'Toast body' }),
        ],
      });
    },
  });
}

describe('toast — bug regression', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ToastRoot has tabindex="-1" (programmatic focus only)', () => {
    const wrapper = mount(createHarness({ duration: Infinity }), { attachTo: document.body });
    const toast = wrapper.find('[role="status"]');
    expect(toast.exists()).toBe(true);
    expect(toast.attributes('tabindex')).toBe('-1');
    wrapper.unmount();
  });

  it('ToastViewport ignores empty hotkey array (does not focus on every keypress)', async () => {
    const wrapper = mount(createHarness({ duration: Infinity, hotkey: [] }), { attachTo: document.body });
    const viewport = wrapper.find('[role="region"]').element as HTMLElement;
    const focusSpy = vi.spyOn(viewport, 'focus');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F8' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(focusSpy).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('ToastViewport responds to F8 when hotkey=["F8"]', () => {
    const wrapper = mount(createHarness({ duration: Infinity }), { attachTo: document.body });
    const viewport = wrapper.find('[role="region"]').element as HTMLElement;
    const focusSpy = vi.spyOn(viewport, 'focus');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F8' }));

    expect(focusSpy).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it('ToastRoot restarts auto-dismiss timer when duration prop changes reactively', async () => {
    const Harness = createHarness({ duration: 1000 });
    const wrapper = mount(Harness, { attachTo: document.body });

    // Bump duration to 5000ms BEFORE original 1000ms elapses.
    vi.advanceTimersByTime(500);
    wrapper.vm.duration = 5000;
    await nextTick();

    // Original 1000ms total would have fired by 1100ms — but the watcher restarted the
    // timer with the new duration. Toast must still be open.
    vi.advanceTimersByTime(600); // 1100ms elapsed total
    await nextTick();
    expect(wrapper.find('[role="status"]').exists()).toBe(true);

    // Now advance the full new duration (5000ms) — toast should close.
    vi.advanceTimersByTime(5000);
    await nextTick();
    await nextTick();
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('ToastRoot timer does not fire when duration=Infinity', () => {
    const wrapper = mount(createHarness({ duration: Infinity }), { attachTo: document.body });
    vi.advanceTimersByTime(60_000);
    expect(wrapper.find('[role="status"]').exists()).toBe(true);
    wrapper.unmount();
  });
});
