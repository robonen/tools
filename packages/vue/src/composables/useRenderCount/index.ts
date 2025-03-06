import { onMounted, onUpdated, readonly, type ComponentInternalInstance } from 'vue';
import { useCounter } from '../useCounter';
import { getLifeCycleTarger } from '../..';
import { SyncMutex } from '@robonen/stdlib';

/**
 * @name useRenderCount
 * @category Components
 * @description Returns the number of times the component has been rendered into the DOM
 * 
 * @param {ComponentInternalInstance} [instance] The component instance to track the render count for
 * @returns {Readonly<Ref<number>>} The number of times the component has been rendered
 * 
 * @example
 * const count = useRenderCount();
 * 
 * @example
 * const count = useRenderCount(getCurrentInstance());
 * 
 * @since 0.0.1
 */
export function useRenderCount(instance?: ComponentInternalInstance) {
    const mutex = new SyncMutex();
    const { count, increment } = useCounter(0);
    const target = getLifeCycleTarger(instance);

    const incrementEffect = () => {
        if (mutex.isLocked) {
            mutex.unlock();
            return;
        }

        mutex.lock();
        increment();
    };

    onMounted(incrementEffect, target);
    onUpdated(incrementEffect, target);

    return readonly(count);
}