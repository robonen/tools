import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { useClickOutside } from '.';

function mountWithOutside(handler: (e: Event) => void) {
  const Comp = defineComponent({
    setup() {
      const target = ref<HTMLElement | null>(null);

      return () => h('div', {
        ref: (el: any) => { target.value = el; },
        'data-testid': 'target',
      }, [
        h('button', { 'data-testid': 'inside' }, 'inside'),
      ]);
    },
    mounted() {
      useClickOutside(() => this.$el, handler);
    },
  });

  return mount(Comp, { attachTo: document.body });
}

describe(useClickOutside, () => {
  it('invokes handler on outside pointerdown', async () => {
    const handler = vi.fn();
    const w = mountWithOutside(handler);

    const outside = document.createElement('button');
    document.body.appendChild(outside);

    await nextTick();
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    expect(handler).toHaveBeenCalledTimes(1);

    outside.remove();
    w.unmount();
  });

  it('does not invoke handler on inside pointerdown', async () => {
    const handler = vi.fn();
    const w = mountWithOutside(handler);
    await nextTick();

    const inside = w.find('[data-testid=inside]').element as HTMLElement;
    inside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));

    expect(handler).not.toHaveBeenCalled();
    w.unmount();
  });

  it('respects the ignore list', async () => {
    const handler = vi.fn();
    const ignored = document.createElement('div');
    document.body.appendChild(ignored);

    const Comp = defineComponent({
      setup() {
        return () => h('div', { 'data-testid': 'target' }, 'target');
      },
      mounted() {
        useClickOutside(() => this.$el, handler, { ignore: [ignored] });
      },
    });

    const w = mount(Comp, { attachTo: document.body });
    await nextTick();

    ignored.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    expect(handler).not.toHaveBeenCalled();

    ignored.remove();
    w.unmount();
  });

  it('treats a press inside a shadow root within the target as inside', async () => {
    // A widget hosted in a shadow root inside a sheet: `contains()` stops at
    // the shadow boundary, so the innermost target of the composed path is
    // not contained by the sheet, and the sheet used to dismiss on it.
    const handler = vi.fn();
    const w = mountWithOutside(handler);
    await nextTick();

    const target = w.find('[data-testid=target]').element as HTMLElement;
    const host = document.createElement('div');
    target.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const inner = document.createElement('button');
    shadow.appendChild(inner);

    inner.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));

    expect(handler).not.toHaveBeenCalled();
    w.unmount();
  });

  it('treats a press inside a shadow root within an ignored node as inside', async () => {
    const handler = vi.fn();
    const ignored = document.createElement('div');
    document.body.appendChild(ignored);
    const shadow = ignored.attachShadow({ mode: 'open' });
    const inner = document.createElement('button');
    shadow.appendChild(inner);

    const Comp = defineComponent({
      setup() {
        return () => h('div', { 'data-testid': 'target' }, 'target');
      },
      mounted() {
        useClickOutside(() => this.$el, handler, { ignore: [ignored] });
      },
    });

    const w = mount(Comp, { attachTo: document.body });
    await nextTick();

    inner.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    expect(handler).not.toHaveBeenCalled();

    ignored.remove();
    w.unmount();
  });

  it('lets the handler prevent the event, so a layer can decline to dismiss', async () => {
    const handler = vi.fn((e: Event) => e.preventDefault());
    const w = mountWithOutside(handler);

    const outside = document.createElement('button');
    document.body.appendChild(outside);
    await nextTick();

    const event = new PointerEvent('pointerdown', { bubbles: true, composed: true, cancelable: true });
    outside.dispatchEvent(event);

    // A passive listener would have made this a no-op and a console warning.
    expect(event.defaultPrevented).toBeTruthy();

    outside.remove();
    w.unmount();
  });
});
