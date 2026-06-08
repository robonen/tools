import { describe, expect, it } from 'vitest';
import { defineComponent, nextTick, shallowRef } from 'vue';
import { mount } from '@vue/test-utils';
import type { UseParentElementReturn } from '.';
import { useParentElement } from '.';

describe(useParentElement, () => {
  it('resolves to the parent of an explicit element ref', async () => {
    const child = document.createElement('span');
    const parent = document.createElement('div');
    parent.appendChild(child);

    const elRef = shallowRef<HTMLElement | null>(child);
    const result = useParentElement(elRef);

    await nextTick();

    expect(result.value).toBe(parent);
  });

  it('reacts when the target element ref changes', async () => {
    const parentA = document.createElement('div');
    const childA = document.createElement('span');
    parentA.appendChild(childA);

    const parentB = document.createElement('section');
    const childB = document.createElement('p');
    parentB.appendChild(childB);

    const elRef = shallowRef<HTMLElement | null>(childA);
    const result = useParentElement(elRef);

    await nextTick();
    expect(result.value).toBe(parentA);

    elRef.value = childB;
    await nextTick();

    expect(result.value).toBe(parentB);
  });

  it('accepts a getter as the target', async () => {
    const child = document.createElement('span');
    const parent = document.createElement('article');
    parent.appendChild(child);

    const result = useParentElement(() => child);

    await nextTick();

    expect(result.value).toBe(parent);
  });

  it('resolves to null/undefined when the element has no parent', async () => {
    const orphan = document.createElement('span');
    const result = useParentElement(shallowRef<HTMLElement | null>(orphan));

    await nextTick();

    expect(result.value).toBeFalsy();
  });

  it('resolves to undefined when the target ref is null (SSR / unmounted path)', async () => {
    const elRef = shallowRef<HTMLElement | null>(null);
    const result = useParentElement(elRef);

    await nextTick();

    expect(result.value).toBeUndefined();
  });

  it('updates to undefined when the target becomes null', async () => {
    const child = document.createElement('span');
    const parent = document.createElement('div');
    parent.appendChild(child);

    const elRef = shallowRef<HTMLElement | null>(child);
    const result = useParentElement(elRef);

    await nextTick();
    expect(result.value).toBe(parent);

    elRef.value = null;
    await nextTick();

    expect(result.value).toBeUndefined();
  });

  it('defaults to the current instance root element parent', async () => {
    let result!: UseParentElementReturn;

    const Child = defineComponent({
      setup() {
        result = useParentElement();
        return {};
      },
      template: `<span class="leaf">leaf</span>`,
    });

    const Parent = defineComponent({
      components: { Child },
      template: `<div class="wrapper"><Child /></div>`,
    });

    const wrapper = mount(Parent);
    await nextTick();

    expect(result.value).toBe(wrapper.find('.wrapper').element);
  });

  it('does not throw outside a component instance (SSR-safe default)', () => {
    let result!: UseParentElementReturn;

    expect(() => {
      result = useParentElement();
    }).not.toThrow();

    expect(result).toBeDefined();
    expect(result.value).toBeUndefined();
  });
});
