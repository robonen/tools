import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import DismissableLayer from '../DismissableLayer.vue';

describe('DismissableLayer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.body.style.pointerEvents = '';
  });

  it('emits escapeKeyDown and dismiss on Escape when topmost', async () => {
    const w = mount(DismissableLayer, {
      attachTo: document.body,
      slots: { default: '<button>inside</button>' },
    });
    await nextTick();

    globalThis.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(w.emitted('escapeKeyDown')).toBeTruthy();
    expect(w.emitted('dismiss')).toBeTruthy();
    w.unmount();
  });

  it('does not dismiss when escapeKeyDown.preventDefault() is called', async () => {
    const w = mount(DismissableLayer, {
      attachTo: document.body,
      slots: { default: '<button>inside</button>' },
      props: {
        onEscapeKeyDown: (e: Event) => e.preventDefault(),
      },
    });
    await nextTick();

    globalThis.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));

    expect(w.emitted('escapeKeyDown')).toBeTruthy();
    expect(w.emitted('dismiss')).toBeFalsy();
    w.unmount();
  });

  it('emits pointerDownOutside on outside pointerdown', async () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);

    const w = mount(DismissableLayer, {
      attachTo: document.body,
      slots: { default: '<button data-testid="inside">in</button>' },
    });
    await nextTick();

    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));

    expect(w.emitted('pointerDownOutside')).toBeTruthy();
    expect(w.emitted('dismiss')).toBeTruthy();
    w.unmount();
  });

  it('does not emit pointerDownOutside on inside pointerdown', async () => {
    const w = mount(DismissableLayer, {
      attachTo: document.body,
      slots: { default: '<button data-testid="inside">in</button>' },
    });
    await nextTick();

    const inside = w.find('[data-testid=inside]').element as HTMLElement;
    inside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));

    expect(w.emitted('pointerDownOutside')).toBeFalsy();
    expect(w.emitted('dismiss')).toBeFalsy();
    w.unmount();
  });

  it('does not dismiss when pointerDownOutside.preventDefault() is called on a non-cancelable event', async () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);

    const w = mount(DismissableLayer, {
      attachTo: document.body,
      slots: { default: '<button>in</button>' },
      props: {
        onPointerDownOutside: (e: Event) => e.preventDefault(),
      },
    });
    await nextTick();

    // PointerEvent constructor defaults to cancelable: false — native
    // defaultPrevented can never flip, prevention must be tracked separately.
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));

    expect(w.emitted('pointerDownOutside')).toBeTruthy();
    expect(w.emitted('dismiss')).toBeFalsy();
    w.unmount();
  });

  it('emits focusOutside and dismiss when focus moves outside', async () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);

    const w = mount(DismissableLayer, {
      attachTo: document.body,
      slots: { default: '<button data-testid="inside">in</button>' },
    });
    await nextTick();

    outside.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    expect(w.emitted('focusOutside')).toBeTruthy();
    expect(w.emitted('dismiss')).toBeTruthy();
    w.unmount();
  });

  it('does not emit focusOutside when focus moves inside', async () => {
    const w = mount(DismissableLayer, {
      attachTo: document.body,
      slots: { default: '<button data-testid="inside">in</button>' },
    });
    await nextTick();

    const inside = w.find('[data-testid=inside]').element as HTMLElement;
    inside.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    expect(w.emitted('focusOutside')).toBeFalsy();
    expect(w.emitted('dismiss')).toBeFalsy();
    w.unmount();
  });

  it('does not dismiss when focusOutside.preventDefault() is called (focusin is non-cancelable)', async () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);

    const w = mount(DismissableLayer, {
      attachTo: document.body,
      slots: { default: '<button>in</button>' },
      props: {
        onFocusOutside: (e: Event) => e.preventDefault(),
      },
    });
    await nextTick();

    outside.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    expect(w.emitted('focusOutside')).toBeTruthy();
    expect(w.emitted('dismiss')).toBeFalsy();
    w.unmount();
  });

  it('does not dismiss nor emit the specific event when interactOutside.preventDefault() is called', async () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);

    const w = mount(DismissableLayer, {
      attachTo: document.body,
      slots: { default: '<button>in</button>' },
      props: {
        onInteractOutside: (e: Event) => e.preventDefault(),
      },
    });
    await nextTick();

    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    outside.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    expect(w.emitted('interactOutside')).toBeTruthy();
    expect(w.emitted('pointerDownOutside')).toBeFalsy();
    expect(w.emitted('focusOutside')).toBeFalsy();
    expect(w.emitted('dismiss')).toBeFalsy();
    w.unmount();
  });

  it('sets body pointer-events: none when disableOutsidePointerEvents is true', async () => {
    const w = mount(DismissableLayer, {
      attachTo: document.body,
      props: { disableOutsidePointerEvents: true },
      slots: { default: '<button>x</button>' },
    });
    await nextTick();

    expect(document.body.style.pointerEvents).toBe('none');
    expect(document.body.dataset['dismissableBlocking']).toBe('true');

    w.unmount();
    expect(document.body.style.pointerEvents).toBe('');
    expect(document.body.dataset['dismissableBlocking']).toBeUndefined();
  });

  it('only topmost layer handles dismiss when nested', async () => {
    const onDismissBottom = vi.fn();
    const onDismissTop = vi.fn();

    const bottom = mount(DismissableLayer, {
      attachTo: document.body,
      props: { onDismiss: onDismissBottom },
      slots: { default: '<button>bottom</button>' },
    });
    await nextTick();

    const top = mount(DismissableLayer, {
      attachTo: document.body,
      props: { onDismiss: onDismissTop },
      slots: { default: '<button>top</button>' },
    });
    await nextTick();

    globalThis.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(onDismissTop).toHaveBeenCalledTimes(1);
    expect(onDismissBottom).not.toHaveBeenCalled();

    top.unmount();

    globalThis.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onDismissBottom).toHaveBeenCalledTimes(1);

    bottom.unmount();
  });
});
