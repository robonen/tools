import type { Ref } from 'vue';

/**
 * A ref that can be set to `null` to remove the associated storage entry.
 * Setting the value to `null` or `undefined` will call `removeItem` on the storage backend.
 */
export type RemovableRef<T> = Ref<T>;
