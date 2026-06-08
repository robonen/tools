import { describe, expect, it } from 'vitest';
import type { UseCurrentElementReturn } from '.';
import { defineComponent, nextTick, ref, shallowRef } from 'vue';
import { mount } from '@vue/test-utils';
import { useCurrentElement } from '.';

describe(useCurrentElement, () => {
  it('resolves to the root DOM element of the current instance after mount', () => {
    let el!: UseCurrentElementReturn;

    const Component = defineComponent({
      setup() {
        el = useCurrentElement();
        return {};
      },
      template: `<div class="root">content</div>`,
    });

    const wrapper = mount(Component);

    expect(el.value).toBe(wrapper.find('.root').element);
    expect(el.value).toBeInstanceOf(HTMLDivElement);
  });

  it('returns a controlled computed ref with trigger / peek / stop', () => {
    let el!: UseCurrentElementReturn;

    const Component = defineComponent({
      setup() {
        el = useCurrentElement();
        return {};
      },
      template: `<div>x</div>`,
    });

    mount(Component);

    expect(el.trigger).toBeTypeOf('function');
    expect(el.peek).toBeTypeOf('function');
    expect(el.stop).toBeTypeOf('function');
  });

  it('re-reads the element on update when the root node changes', async () => {
    let el!: UseCurrentElementReturn;
    const flag = ref(true);

    const Component = defineComponent({
      setup() {
        el = useCurrentElement();
        return { flag };
      },
      template: `
        <div v-if="flag" class="a">a</div>
        <section v-else class="b">b</section>
      `,
    });

    const wrapper = mount(Component);

    expect(el.value).toBeInstanceOf(HTMLDivElement);

    flag.value = false;
    await nextTick();

    expect(el.value).toBe(wrapper.find('.b').element);
    expect(el.value).toBeInstanceOf(HTMLElement);
    expect((el.value as Element).tagName).toBe('SECTION');
  });

  it('tracks an explicit rootComponent ref instead of $el', async () => {
    const innerRef = shallowRef<Element | null>(null);
    let el!: UseCurrentElementReturn;

    const Component = defineComponent({
      setup() {
        el = useCurrentElement(innerRef as any);
        return {};
      },
      template: `<div class="outer"><span class="inner">i</span></div>`,
    });

    const wrapper = mount(Component);

    // Before assigning the ref, it resolves to whatever the ref holds (null/undefined)
    expect(el.value).toBeFalsy();

    innerRef.value = wrapper.find('.inner').element;
    el.trigger();
    await nextTick();

    expect(el.value).toBe(wrapper.find('.inner').element);
  });

  it('stops re-reading after scope disposal (unmount)', async () => {
    let el!: UseCurrentElementReturn;

    const Component = defineComponent({
      setup() {
        el = useCurrentElement();
        return {};
      },
      template: `<div class="alive">alive</div>`,
    });

    const wrapper = mount(Component);
    const mountedEl = el.value;

    expect(mountedEl).toBeInstanceOf(HTMLDivElement);

    wrapper.unmount();

    // After unmount the controlled watcher is stopped; trigger is safe and the
    // value no longer tracks a live element.
    expect(() => el.trigger()).not.toThrow();
  });

  it('does not throw and resolves to undefined outside a component instance (SSR-safe)', () => {
    let el!: UseCurrentElementReturn;

    expect(() => {
      el = useCurrentElement();
    }).not.toThrow();

    expect(el).toBeDefined();
    expect(el.value).toBeUndefined();
  });
});
