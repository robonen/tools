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
});
