import { watch, type Ref, type WatchOptions, type WatchSource } from 'vue';
import { isArray } from '@robonen/stdlib';

/**
 * @name useSyncRefs
 * @category Reactivity
 * @description Syncs the value of a source ref with multiple target refs
 * 
 * @param {WatchSource<T>} source Source ref to sync
 * @param {Ref<T> | Ref<T>[]} targets Target refs to sync
 * @param {WatchOptions} watchOptions Watch options
 * @returns {WatchStopHandle} Watch stop handle
 * 
 * @example
 * const source = ref(0);
 * const target1 = ref(0);
 * const target2 = ref(0);
 * useSyncRefs(source, [target1, target2]);
 * 
 * @example
 * const source = ref(0);
 * const target1 = ref(0);
 * useSyncRefs(source, target1, { immediate: true });
 * 
 * @since 0.0.1
 */
export function useSyncRefs<T = unknown>(
    source: WatchSource<T>,
    targets: Ref<T> | Ref<T>[],
    watchOptions: WatchOptions = {},
) {
    const {
        flush = 'sync',
        deep = false,
        immediate = true,
    } = watchOptions;

    if (!isArray(targets))
        targets = [targets];

    return watch(
        source,
        (value) => targets.forEach((target) => target.value = value),
        { flush, deep, immediate },
    );
}
