import type { MaybeRefOrGetter, Ref } from 'vue';

/**
 * A ref that can be set to `null` to remove the associated storage entry.
 * Setting the value to `null` or `undefined` will call `removeItem` on the storage backend.
 */
export type RemovableRef<T> = Ref<T>;

/**
 * Argument form accepted by the reactive math helpers (`useMax`, `useMin`, `useSum`, `useAverage`):
 * either a spread of (possibly reactive) values, or a single (possibly reactive) array of them.
 */
export type MaybeComputedRefArgs<T>
  = | Array<MaybeRefOrGetter<T>>
    | [MaybeRefOrGetter<Array<MaybeRefOrGetter<T>>>];
