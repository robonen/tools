import type { ComputedRef, DefineComponent, ShallowRef } from 'vue';
import {
  computed,
  defineComponent,
  h,
  markRaw,
  shallowRef,
  triggerRef,
  watch,
} from 'vue';
import { unrefElement, useContextFactory } from '@robonen/vue';
import { Slot } from '../primitive';

/**
 * Data attribute used to locate items inside a collection via `querySelectorAll`.
 * Rendered automatically by `<CollectionItem>`.
 */
const ITEM_DATA_ATTR = 'data-collection-item';

export interface CollectionItemData<Value = unknown> {
  /** DOM element that represents the item. */
  ref: HTMLElement;
  /** Arbitrary `value` associated with the item via `<CollectionItem :value>`. */
  value?: Value;
}

export interface CollectionContext<Value = unknown> {
  /** Root element of the collection (set by `<CollectionSlot>`). */
  collectionRef: ShallowRef<HTMLElement | undefined>;
  /** Raw element→data map. Mutated via `triggerRef` — do not rely on deep reactivity. */
  itemMap: ShallowRef<Map<HTMLElement, CollectionItemData<Value>>>;
  /**
   * Returns items sorted by their DOM order. Items with `data-disabled` are
   * skipped unless `includeDisabled` is `true`.
   *
   * The ordering comes from `collectionRef.querySelectorAll(...)`, which means
   * it survives `<Teleport>`, `<Suspense>` and `v-for` reorders — unlike a
   * mount-order based registry.
   */
  getItems: (includeDisabled?: boolean) => Array<CollectionItemData<Value>>;
  /** Reactive snapshot of all items (unsorted). Invalidated when `itemMap` changes. */
  reactiveItems: ComputedRef<Array<CollectionItemData<Value>>>;
  /** Reactive count of items. */
  itemMapSize: ComputedRef<number>;
  /** Root marker component — render at the collection's root. */
  CollectionSlot: DefineComponent;
  /** Item marker component — wrap each focusable/selectable child. */
  CollectionItem: DefineComponent<{ value?: unknown }>;
}

function createCollectionState<Value = unknown>(): CollectionContext<Value> {
  // `shallowRef` + manual `triggerRef` avoids wrapping the Map in a deep Proxy.
  // For collections with many items (large lists, menus, listboxes) this is
  // measurably cheaper than `ref(new Map())`.
  const collectionRef = shallowRef<HTMLElement>();
  const itemMap = shallowRef(
    new Map<HTMLElement, CollectionItemData<Value>>(),
  );

  const getItems = (includeDisabled = false) => {
    const collectionNode = collectionRef.value;
    if (!collectionNode) return [];

    const orderedNodes = Array.from(
      collectionNode.querySelectorAll(`[${ITEM_DATA_ATTR}]`),
    );
    const items = Array.from(itemMap.value.values());
    items.sort(
      (a, b) => orderedNodes.indexOf(a.ref) - orderedNodes.indexOf(b.ref),
    );

    return includeDisabled
      ? items
      : items.filter(i => i.ref.dataset['disabled'] !== '');
  };

  const CollectionSlot = defineComponent({
    name: 'CollectionSlot',
    inheritAttrs: false,
    setup(_, { slots, attrs }) {
      return () =>
        h(
          Slot,
          {
            ...attrs,
            ref: (el: unknown) => {
              const element = unrefElement(el as Parameters<typeof unrefElement>[0]);
              if (element instanceof HTMLElement) {
                collectionRef.value = element;
              }
            },
          },
          slots,
        );
    },
  }) as DefineComponent;

  const CollectionItem = defineComponent({
    name: 'CollectionItem',
    inheritAttrs: false,
    props: {
      value: {
        // Accepts any value.
        validator: () => true,
      },
    },
    setup(props, { slots, attrs }) {
      const currentElement = shallowRef<HTMLElement>();

      watch(
        [currentElement, () => props.value],
        ([el], _prev, onCleanup) => {
          if (!el) return;
          // `markRaw` keeps Vue from trying to make the element reactive —
          // we only care about identity as a Map key.
          const key = markRaw(el);
          itemMap.value.set(key, { ref: el, value: props.value as Value });
          triggerRef(itemMap);

          onCleanup(() => {
            itemMap.value.delete(key);
            triggerRef(itemMap);
          });
        },
        { immediate: true },
      );

      return () =>
        h(
          Slot,
          {
            ...attrs,
            [ITEM_DATA_ATTR]: '',
            ref: (el: unknown) => {
              const element = unrefElement(el as Parameters<typeof unrefElement>[0]);
              if (element instanceof HTMLElement) {
                currentElement.value = element;
              }
            },
          },
          slots,
        );
    },
  }) as DefineComponent<{ value?: unknown }>;

  const reactiveItems = computed(() => Array.from(itemMap.value.values()));
  const itemMapSize = computed(() => itemMap.value.size);

  return {
    collectionRef,
    itemMap,
    getItems,
    reactiveItems,
    itemMapSize,
    CollectionSlot,
    CollectionItem,
  };
}

const DEFAULT_COLLECTION_KEY = 'CollectionContext';

// One context factory per namespace key (`useContextFactory` mints a unique
// Symbol per call). Without namespacing, a collection provider nested inside
// another (e.g. `RovingFocusGroup` between `NavigationMenuRoot` and
// `NavigationMenuTrigger`) shadows the outer collection for every descendant.
const collectionContextFactories = new Map<
  string,
  ReturnType<typeof useContextFactory<CollectionContext>>
>();

function getCollectionContextFactory(key: string) {
  let factory = collectionContextFactories.get(key);
  if (!factory) {
    factory = useContextFactory<CollectionContext>(key);
    collectionContextFactories.set(key, factory);
  }
  return factory;
}

/**
 * Creates a new collection state and provides it to descendants.
 * Call this in the parent (e.g. `RovingFocusGroup`, `ListboxRoot`).
 *
 * Pass a dedicated `key` when the component tree may nest another collection
 * provider between this one and its injectors, so they don't shadow each other.
 *
 * @example
 * ```ts
 * const { getItems, CollectionSlot } = useCollectionProvider();
 * ```
 */
export function useCollectionProvider<Value = unknown>(
  key: string = DEFAULT_COLLECTION_KEY,
): CollectionContext<Value> {
  const ctx = createCollectionState<Value>();
  getCollectionContextFactory(key).provide(ctx as CollectionContext);
  return ctx;
}

/**
 * Injects the collection context from the nearest `useCollectionProvider()`
 * called with the same `key`.
 * Call this in children (e.g. `RovingFocusItem`, `ListboxItem`).
 *
 * @throws when used outside a provider.
 */
export function useCollectionInjector<Value = unknown>(
  key: string = DEFAULT_COLLECTION_KEY,
): CollectionContext<Value> {
  return getCollectionContextFactory(key).inject() as CollectionContext<Value>;
}
