import { describe, expect, it } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { useId } from '.';

function mountWithId(deterministic?: () => string | undefined, prefix?: string) {
  const Comp = defineComponent({
    setup() {
      const id = useId(deterministic, prefix);
      return () => h('span', { 'data-id': id.value }, id.value);
    },
  });

  return mount(Comp);
}

describe(useId, () => {
  it('returns a non-empty string', () => {
    const w = mountWithId();
    expect(w.text()).toMatch(/^robonen-/);
    w.unmount();
  });

  it('uses custom prefix', () => {
    const w = mountWithId(undefined, 'dialog');
    expect(w.text()).toMatch(/^dialog-/);
    w.unmount();
  });

  it('returns deterministic value when provided', () => {
    const w = mountWithId(() => 'custom-id');
    expect(w.text()).toBe('custom-id');
    w.unmount();
  });

  it('falls back to generated when deterministic is empty', () => {
    const w = mountWithId(() => '', 'x');
    expect(w.text()).toMatch(/^x-/);
    w.unmount();
  });

  it('is reactive to deterministic input changes', async () => {
    const d = ref<string | undefined>(undefined);

    const Comp = defineComponent({
      setup() {
        const id = useId(() => d.value, 'p');
        return () => h('span', id.value);
      },
    });

    const w = mount(Comp);
    expect(w.text()).toMatch(/^p-/);

    d.value = 'forced';
    await w.vm.$nextTick();

    expect(w.text()).toBe('forced');
    w.unmount();
  });
});
