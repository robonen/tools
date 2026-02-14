import { describe, expect, it } from 'vitest';
import { computed, defineComponent, nextTick, ref, shallowRef } from 'vue';
import { mount } from '@vue/test-utils'
import { unrefElement } from '.';

describe('unrefElement', () => {
  it('returns a plain element when passed a raw element', () => {
    const htmlEl = document.createElement('div');
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

    expect(unrefElement(htmlEl)).toBe(htmlEl);
    expect(unrefElement(svgEl)).toBe(svgEl);
  });

  it('returns element when passed a ref or shallowRef to an element', () => {
    const el = document.createElement('div');
    const elRef = ref<HTMLElement | null>(el);
    const shallowElRef = shallowRef<HTMLElement | null>(el);

    expect(unrefElement(elRef)).toBe(el);
    expect(unrefElement(shallowElRef)).toBe(el);
  });

  it('returns element when passed a computed ref or getter function', () => {
    const el = document.createElement('div');
    const computedElRef = computed(() => el);
    const elGetter = () => el;

    expect(unrefElement(computedElRef)).toBe(el);
    expect(unrefElement(elGetter)).toBe(el);
  });

  it('returns component $el when passed a component instance', async () => {
    const Child = defineComponent({
        template: `<span class="child-el">child</span>`,
    });

    const Parent = defineComponent({
        components: { Child },
        template: `<Child ref="childRef" />`,
    });

    const wrapper = mount(Parent);
    await nextTick();

    const childInstance = (wrapper.vm as any).$refs.childRef;
    const result = unrefElement(childInstance);

    expect(result).toBe(childInstance.$el);
    expect((result as HTMLElement).classList.contains('child-el')).toBe(true);
  });

  it('handles null and undefined values', () => {
    expect(unrefElement(undefined)).toBe(undefined);
    expect(unrefElement(null)).toBe(null);
    expect(unrefElement(ref(null))).toBe(null);
    expect(unrefElement(ref(undefined))).toBe(undefined);
    expect(unrefElement(() => null)).toBe(null);
    expect(unrefElement(() => undefined)).toBe(undefined);
  });
});
