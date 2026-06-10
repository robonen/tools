import type { VueWrapper } from '@vue/test-utils';
import type { CollectionContext } from '../useCollection';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';

import { useCollectionInjector, useCollectionProvider } from '../useCollection';

const wrappers: Array<VueWrapper<any>> = [];

afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
});

function track<T extends VueWrapper<any>>(w: T): T {
  wrappers.push(w);
  return w;
}

function makeProvider(onCreated: (ctx: CollectionContext) => void, key?: string) {
  return defineComponent({
    setup(_, { slots }) {
      const ctx = key === undefined ? useCollectionProvider() : useCollectionProvider(key);
      onCreated(ctx);
      return () => h(ctx.CollectionSlot, null, { default: () => h('div', null, slots.default?.()) });
    },
  });
}

function makeItem(id: string, key?: string) {
  return defineComponent({
    setup() {
      const { CollectionItem } = key === undefined
        ? useCollectionInjector()
        : useCollectionInjector(key);
      return () => h(CollectionItem, null, { default: () => h('button', { id }) });
    },
  });
}

describe('useCollection — default key', () => {
  it('registers items into the nearest provider and returns them in DOM order', async () => {
    let ctx!: CollectionContext;
    const Provider = makeProvider(c => (ctx = c));
    const Harness = defineComponent({
      setup() {
        return () => h(Provider, null, {
          default: () => [h(makeItem('one')), h(makeItem('two'))],
        });
      },
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    expect(ctx.getItems().map(i => i.ref.id)).toEqual(['one', 'two']);
  });
});

describe('useCollection — namespaced keys', () => {
  it('a nested default-key provider does not shadow an outer namespaced provider', async () => {
    let outer!: CollectionContext;
    let inner!: CollectionContext;
    const Outer = makeProvider(c => (outer = c), 'TestOuterCollection');
    const Inner = makeProvider(c => (inner = c)); // default key, in between
    const Harness = defineComponent({
      setup() {
        return () => h(Outer, null, {
          default: () => h(Inner, null, {
            default: () => [
              // Registers into the *outer* collection despite the inner provider.
              h(makeItem('outer-item', 'TestOuterCollection')),
              h(makeItem('inner-item')),
            ],
          }),
        });
      },
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    expect(outer.getItems().map(i => i.ref.id)).toEqual(['outer-item']);
    expect(inner.getItems().map(i => i.ref.id)).toEqual(['inner-item']);
  });

  it('distinct keys keep fully independent registries', async () => {
    let a!: CollectionContext;
    let b!: CollectionContext;
    const A = makeProvider(c => (a = c), 'TestKeyA');
    const B = makeProvider(c => (b = c), 'TestKeyB');
    const Harness = defineComponent({
      setup() {
        return () => h(A, null, {
          default: () => h(B, null, {
            default: () => [
              h(makeItem('a-item', 'TestKeyA')),
              h(makeItem('b-item', 'TestKeyB')),
            ],
          }),
        });
      },
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    expect(a.getItems().map(i => i.ref.id)).toEqual(['a-item']);
    expect(b.getItems().map(i => i.ref.id)).toEqual(['b-item']);
  });
});
