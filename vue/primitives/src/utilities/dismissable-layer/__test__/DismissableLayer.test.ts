import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import DismissableLayer from '../DismissableLayer.vue';
import DismissableLayerBranch from '../DismissableLayerBranch.vue';

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

  describe('branches', () => {
    function mountWithBranch(handlers: Record<string, unknown>) {
      const Harness = defineComponent({
        props: ['handlers'],
        setup(props) {
          return () =>
            h('div', [
              h(DismissableLayer, props.handlers, { default: () => h('button', 'inside') }),
              h(DismissableLayerBranch, null, {
                default: () => h('button', { 'data-testid': 'branch' }, 'related'),
              }),
            ]);
        },
      });
      return mount(Harness, { attachTo: document.body, props: { handlers } });
    }

    it('does not dismiss on pointerdown inside a registered branch', async () => {
      const onDismiss = vi.fn();
      const w = mountWithBranch({ onDismiss });
      await nextTick();
      await nextTick();

      const branchBtn = w.find('[data-testid=branch]').element as HTMLElement;
      branchBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));

      expect(onDismiss).not.toHaveBeenCalled();
      w.unmount();
    });

    it('does not dismiss on focusin inside a registered branch', async () => {
      const onDismiss = vi.fn();
      const onFocusOutside = vi.fn();
      const w = mountWithBranch({ onDismiss, onFocusOutside });
      await nextTick();
      await nextTick();

      const branchBtn = w.find('[data-testid=branch]').element as HTMLElement;
      branchBtn.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

      expect(onFocusOutside).not.toHaveBeenCalled();
      expect(onDismiss).not.toHaveBeenCalled();
      w.unmount();
    });

    it('still dismisses on pointerdown outside both layer and branch', async () => {
      const outside = document.createElement('button');
      document.body.appendChild(outside);

      const onDismiss = vi.fn();
      const w = mountWithBranch({ onDismiss });
      await nextTick();
      await nextTick();

      outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));

      expect(onDismiss).toHaveBeenCalledTimes(1);
      w.unmount();
      outside.remove();
    });

    it('unregisters the branch on unmount so it no longer shields outside clicks', async () => {
      const outside = document.createElement('button');
      document.body.appendChild(outside);

      const Harness = defineComponent({
        components: { DismissableLayer, DismissableLayerBranch },
        props: ['onDismiss', 'showBranch'],
        setup(props) {
          return () =>
            h('div', [
              h(DismissableLayer, { onDismiss: props.onDismiss }, { default: () => h('button', 'inside') }),
              props.showBranch
                ? h(DismissableLayerBranch, null, { default: () => h('button', { 'data-testid': 'branch' }, 'related') })
                : null,
            ]);
        },
      });

      const onDismiss = vi.fn();
      const w = mount(Harness, { attachTo: document.body, props: { onDismiss, showBranch: true } });
      await nextTick();
      await nextTick();

      // Branch present: clicking it does not dismiss.
      const branchBtn = w.find('[data-testid=branch]').element as HTMLElement;
      branchBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
      expect(onDismiss).not.toHaveBeenCalled();

      // Remove the branch; a fresh outside pointerdown now dismisses.
      await w.setProps({ showBranch: false });
      await nextTick();
      outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
      expect(onDismiss).toHaveBeenCalledTimes(1);

      w.unmount();
      outside.remove();
    });
  });

  describe('per-layer pointer-events', () => {
    it('does not set a pointer-events override when no layer disables outside events', async () => {
      const w = mount(DismissableLayer, {
        attachTo: document.body,
        slots: { default: '<button>x</button>' },
      });
      await nextTick();

      const el = w.find('[data-dismissable-layer]').element as HTMLElement;
      expect(el.style.pointerEvents).toBe('');
      w.unmount();
    });

    it('keeps the disabling layer interactive and makes a lower non-disabling layer inert', async () => {
      const bottom = mount(DismissableLayer, {
        attachTo: document.body,
        slots: { default: '<button>bottom</button>' },
      });
      await nextTick();

      const top = mount(DismissableLayer, {
        attachTo: document.body,
        props: { disableOutsidePointerEvents: true },
        slots: { default: '<button>top</button>' },
      });
      await nextTick();
      await nextTick();

      const bottomEl = bottom.find('[data-dismissable-layer]').element as HTMLElement;
      const topEl = top.find('[data-dismissable-layer]').element as HTMLElement;

      // The blocking layer (top) stays clickable; the layer beneath it is sealed off.
      expect(topEl.style.pointerEvents).toBe('auto');
      expect(bottomEl.style.pointerEvents).toBe('none');

      top.unmount();
      await nextTick();

      // Once the blocking layer is gone, the override is cleared everywhere.
      expect(bottomEl.style.pointerEvents).toBe('');
      bottom.unmount();
    });
  });

  describe('DismissableLayerBranch', () => {
    it('renders its slot through the polymorphic element and forwards as', async () => {
      const w = mount(DismissableLayerBranch, {
        attachTo: document.body,
        props: { as: 'section' },
        slots: { default: '<span data-testid="child">x</span>' },
      });
      await nextTick();

      expect(w.element.tagName).toBe('SECTION');
      expect(w.find('[data-testid=child]').exists()).toBe(true);
      w.unmount();
    });
  });
});
