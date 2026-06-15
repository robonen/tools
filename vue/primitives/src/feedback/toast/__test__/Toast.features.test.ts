// Feature/parity tests for the toast primitive's additive capabilities:
//   - screen-reader announce region (deferred render + text harvesting + exclude)
//   - ToastAction / ToastClose announce-exclude + ToastClose type=button
//   - controlled / uncontrolled (defaultOpen) open state
//   - forceMount keeps the toast mounted while closed
//   - Escape closes a focused toast and flags isFocusedToastEscapeKeyDownRef
//   - focus returns to the viewport when a focused toast closes
//   - viewport {hotkey} label interpolation + function-form label
//   - swipe-to-dismiss gesture (emits + data-swipe + CSS vars) and disableSwipe
//   - elapsed-time-preserving pause/resume

import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import {
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastRoot,
  ToastTitle,
  ToastViewport,
  useToastProviderContext,
} from '../index';

function press(el: Element, key: string, init: KeyboardEventInit = {}) {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
}

function nextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function pointer(el: Element, type: string, init: PointerEventInit = {}) {
  // jsdom lacks PointerEvent; fall back to a MouseEvent-ish CustomEvent carrying coords.
  const Ctor = (globalThis as { PointerEvent?: typeof PointerEvent }).PointerEvent;
  let event: Event;
  if (Ctor) {
    event = new Ctor(type, { bubbles: true, cancelable: true, ...init });
  }
  else {
    event = new Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, { button: 0, pointerId: 1, pointerType: 'mouse', ...init });
  }
  // Stub pointer-capture methods used by the handlers.
  Object.assign(el, {
    setPointerCapture: () => {},
    releasePointerCapture: () => {},
    hasPointerCapture: () => false,
  });
  el.dispatchEvent(event);
}

describe('toast — announce region', () => {
  afterEach(() => vi.restoreAllMocks());

  it('renders a hidden announce region after a frame and harvests toast text', async () => {
    const wrapper = mount(
      defineComponent({
        components: { ToastProvider, ToastViewport, ToastRoot, ToastTitle, ToastDescription },
        render() {
          return h(ToastProvider, {}, {
            default: () => [
              h(ToastViewport),
              h(ToastRoot, { duration: Infinity }, {
                default: () => [
                  h(ToastTitle, {}, { default: () => 'Saved' }),
                  h(ToastDescription, {}, { default: () => 'Your changes are stored.' }),
                ],
              }),
            ],
          });
        },
      }),
      { attachTo: document.body },
    );

    await nextTick();
    await nextFrame();
    await nextTick();

    const announce = document.querySelector('[data-primitives-toast-announce]');
    expect(announce).not.toBeNull();
    expect(announce?.textContent).toContain('Saved');
    expect(announce?.textContent).toContain('Your changes are stored.');

    wrapper.unmount();
  });

  it('excludes ToastClose / ToastAction visible text and substitutes altText', async () => {
    const wrapper = mount(
      defineComponent({
        components: { ToastProvider, ToastViewport, ToastRoot, ToastTitle, ToastAction, ToastClose },
        render() {
          return h(ToastProvider, {}, {
            default: () => [
              h(ToastViewport),
              h(ToastRoot, { duration: Infinity }, {
                default: () => [
                  h(ToastTitle, {}, { default: () => 'Archived' }),
                  h(ToastAction, { altText: 'Undo archiving' }, { default: () => 'Undo' }),
                  h(ToastClose, {}, { default: () => 'X' }),
                ],
              }),
            ],
          });
        },
      }),
      { attachTo: document.body },
    );

    await nextTick();
    await nextFrame();
    await nextTick();

    const announce = document.querySelector('[data-primitives-toast-announce]');
    expect(announce?.textContent).toContain('Archived');
    // altText is announced in place of the visible "Undo" label.
    expect(announce?.textContent).toContain('Undo archiving');
    // The close button's visible "X" is excluded.
    expect(announce?.textContent).not.toContain('X');

    wrapper.unmount();
  });
});

describe('toast — ToastClose / ToastAction', () => {
  it('ToastClose renders type="button" and carries the announce-exclude attribute', () => {
    const wrapper = mount(
      defineComponent({
        components: { ToastProvider, ToastViewport, ToastRoot, ToastClose },
        render() {
          return h(ToastProvider, {}, {
            default: () => [
              h(ToastViewport),
              h(ToastRoot, { duration: Infinity }, {
                default: () => h(ToastClose, {}, { default: () => 'Close' }),
              }),
            ],
          });
        },
      }),
      { attachTo: document.body },
    );

    const close = wrapper.find('[data-primitives-toast-close]').element as HTMLButtonElement;
    expect(close.getAttribute('type')).toBe('button');
    expect(close.getAttribute('data-primitives-toast-announce-exclude')).toBe('');
    wrapper.unmount();
  });

  it('ToastAction carries the announce-exclude alt text', () => {
    const wrapper = mount(
      defineComponent({
        components: { ToastProvider, ToastViewport, ToastRoot, ToastAction },
        render() {
          return h(ToastProvider, {}, {
            default: () => [
              h(ToastViewport),
              h(ToastRoot, { duration: Infinity }, {
                default: () => h(ToastAction, { altText: 'Undo it' }, { default: () => 'Undo' }),
              }),
            ],
          });
        },
      }),
      { attachTo: document.body },
    );

    const action = wrapper.find('[data-primitives-toast-action]').element as HTMLElement;
    expect(action.getAttribute('data-primitives-toast-announce-exclude')).toBe('');
    expect(action.getAttribute('data-primitives-toast-announce-alt')).toBe('Undo it');
    expect(action.getAttribute('aria-label')).toBe('Undo it');
    wrapper.unmount();
  });
});

describe('toast — open state', () => {
  it('uncontrolled defaultOpen=false starts closed', async () => {
    const wrapper = mount(
      defineComponent({
        components: { ToastProvider, ToastViewport, ToastRoot },
        render() {
          return h(ToastProvider, {}, {
            default: () => [
              h(ToastViewport),
              h(ToastRoot, { duration: Infinity, defaultOpen: false }, { default: () => 'Body' }),
            ],
          });
        },
      }),
      { attachTo: document.body },
    );

    await nextTick();
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('controlled v-model:open drives visibility', async () => {
    const open = ref(true);
    const wrapper = mount(
      defineComponent({
        components: { ToastProvider, ToastViewport, ToastRoot },
        setup: () => ({ open }),
        render() {
          return h(ToastProvider, {}, {
            default: () => [
              h(ToastViewport),
              h(ToastRoot, {
                duration: Infinity,
                open: this.open,
                'onUpdate:open': (v: boolean) => { this.open = v; },
              }, { default: () => 'Body' }),
            ],
          });
        },
      }),
      { attachTo: document.body },
    );

    await nextTick();
    expect(wrapper.find('[role="status"]').exists()).toBe(true);

    open.value = false;
    await nextTick();
    await nextTick();
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('forceMount keeps the toast mounted while closed', async () => {
    const wrapper = mount(
      defineComponent({
        components: { ToastProvider, ToastViewport, ToastRoot },
        render() {
          return h(ToastProvider, {}, {
            default: () => [
              h(ToastViewport),
              h(ToastRoot, { duration: Infinity, open: false, forceMount: true }, { default: () => 'Body' }),
            ],
          });
        },
      }),
      { attachTo: document.body },
    );

    await nextTick();
    const toast = wrapper.find('[role="status"]');
    expect(toast.exists()).toBe(true);
    expect(toast.attributes('data-state')).toBe('closed');
    wrapper.unmount();
  });
});

describe('toast — Escape + focus return', () => {
  it('Escape on a focused toast closes it and flags the provider ref', async () => {
    let providerCtx: ReturnType<typeof useToastProviderContext> | null = null;
    const Probe = defineComponent({
      setup() {
        providerCtx = useToastProviderContext();
        return () => null;
      },
    });

    const escapeSpy = vi.fn();
    const wrapper = mount(
      defineComponent({
        components: { ToastProvider, ToastViewport, ToastRoot, Probe },
        render() {
          return h(ToastProvider, {}, {
            default: () => [
              h(Probe),
              h(ToastViewport),
              h(ToastRoot, { duration: Infinity, onEscapeKeyDown: escapeSpy }, { default: () => 'Body' }),
            ],
          });
        },
      }),
      { attachTo: document.body },
    );

    await nextTick();
    const toast = wrapper.find('[role="status"]').element as HTMLElement;
    toast.focus();
    press(toast, 'Escape');
    await nextTick();
    await nextTick();

    expect(escapeSpy).toHaveBeenCalledOnce();
    expect(providerCtx!.isFocusedToastEscapeKeyDownRef.value).toBe(true);
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('returns focus to the viewport when a focused toast closes via ToastClose', async () => {
    const wrapper = mount(
      defineComponent({
        components: { ToastProvider, ToastViewport, ToastRoot, ToastClose },
        render() {
          return h(ToastProvider, {}, {
            default: () => [
              h(ToastViewport),
              h(ToastRoot, { duration: Infinity }, {
                default: () => h(ToastClose, {}, { default: () => 'Close' }),
              }),
            ],
          });
        },
      }),
      { attachTo: document.body },
    );

    await nextTick();
    const viewport = wrapper.find('[role="region"]').element as HTMLElement;
    const close = wrapper.find('[data-primitives-toast-close]').element as HTMLButtonElement;
    const focusSpy = vi.spyOn(viewport, 'focus');

    close.focus();
    close.click();
    await nextTick();

    expect(focusSpy).toHaveBeenCalled();
    wrapper.unmount();
  });
});

describe('toast — viewport label', () => {
  it('interpolates the {hotkey} placeholder', () => {
    const wrapper = mount(
      defineComponent({
        components: { ToastProvider, ToastViewport },
        render() {
          return h(ToastProvider, {}, {
            default: () => h(ToastViewport, { label: 'Alerts ({hotkey})', hotkey: ['F8'] }),
          });
        },
      }),
      { attachTo: document.body },
    );

    expect(wrapper.find('[role="region"]').attributes('aria-label')).toBe('Alerts (F8)');
    wrapper.unmount();
  });

  it('supports a function-form label', () => {
    const wrapper = mount(
      defineComponent({
        components: { ToastProvider, ToastViewport },
        render() {
          return h(ToastProvider, {}, {
            default: () => h(ToastViewport, { label: (hk: string) => `Toasts [${hk}]`, hotkey: ['F8'] }),
          });
        },
      }),
      { attachTo: document.body },
    );

    expect(wrapper.find('[role="region"]').attributes('aria-label')).toBe('Toasts [F8]');
    wrapper.unmount();
  });
});

describe('toast — swipe to dismiss', () => {
  it('emits swipe events and closes when threshold is exceeded', async () => {
    const swipeEnd = vi.fn();
    const open = ref(true);
    const wrapper = mount(
      defineComponent({
        components: { ToastProvider, ToastViewport, ToastRoot },
        setup: () => ({ open }),
        render() {
          return h(ToastProvider, { swipeDirection: 'right', swipeThreshold: 10 }, {
            default: () => [
              h(ToastViewport),
              h(ToastRoot, {
                duration: Infinity,
                open: this.open,
                'onUpdate:open': (v: boolean) => { this.open = v; },
                onSwipeEnd: swipeEnd,
              }, { default: () => 'Body' }),
            ],
          });
        },
      }),
      { attachTo: document.body },
    );

    await nextTick();
    const toast = wrapper.find('[role="status"]').element as HTMLElement;

    pointer(toast, 'pointerdown', { clientX: 0, clientY: 0, button: 0, pointerType: 'mouse', pointerId: 1 });
    // First move past the start buffer in the swipe direction.
    pointer(toast, 'pointermove', { clientX: 30, clientY: 0, pointerType: 'mouse', pointerId: 1 });
    pointer(toast, 'pointermove', { clientX: 60, clientY: 0, pointerType: 'mouse', pointerId: 1 });
    pointer(toast, 'pointerup', { clientX: 60, clientY: 0, pointerType: 'mouse', pointerId: 1 });
    await nextTick();
    await nextTick();

    expect(swipeEnd).toHaveBeenCalled();
    expect(toast.getAttribute('data-swipe')).toBe('end');
    expect(open.value).toBe(false);
    wrapper.unmount();
  });

  it('disableSwipe prevents any swipe handling', async () => {
    const swipeStart = vi.fn();
    const wrapper = mount(
      defineComponent({
        components: { ToastProvider, ToastViewport, ToastRoot },
        render() {
          return h(ToastProvider, { disableSwipe: true, swipeDirection: 'right' }, {
            default: () => [
              h(ToastViewport),
              h(ToastRoot, { duration: Infinity, onSwipeStart: swipeStart }, { default: () => 'Body' }),
            ],
          });
        },
      }),
      { attachTo: document.body },
    );

    await nextTick();
    const toast = wrapper.find('[role="status"]').element as HTMLElement;
    pointer(toast, 'pointerdown', { clientX: 0, clientY: 0, button: 0, pointerType: 'mouse', pointerId: 1 });
    pointer(toast, 'pointermove', { clientX: 60, clientY: 0, pointerType: 'mouse', pointerId: 1 });

    expect(swipeStart).not.toHaveBeenCalled();
    expect(toast.getAttribute('data-swipe')).toBeNull();
    wrapper.unmount();
  });
});

describe('toast — elapsed-time-preserving pause/resume', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('resumes from the remaining time instead of restarting the full duration', async () => {
    const wrapper = mount(
      defineComponent({
        components: { ToastProvider, ToastViewport, ToastRoot },
        render() {
          return h(ToastProvider, {}, {
            default: () => [
              h(ToastViewport),
              h(ToastRoot, { duration: 1000 }, { default: () => 'Body' }),
            ],
          });
        },
      }),
      { attachTo: document.body },
    );

    const viewport = wrapper.find('[role="region"]').element as HTMLElement;

    // Elapse 800ms, then pause (banks ~200ms remaining).
    vi.advanceTimersByTime(800);
    viewport.dispatchEvent(new CustomEvent('toast.viewportPause', { bubbles: true }));
    await nextTick();

    // While paused, time passing does not close the toast.
    vi.advanceTimersByTime(5000);
    await nextTick();
    expect(wrapper.find('[role="status"]').exists()).toBe(true);

    // Resume — should close after the remaining ~200ms, not a full 1000ms.
    viewport.dispatchEvent(new CustomEvent('toast.viewportResume', { bubbles: true }));
    vi.advanceTimersByTime(250);
    await nextTick();
    await nextTick();
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
    wrapper.unmount();
  });
});
