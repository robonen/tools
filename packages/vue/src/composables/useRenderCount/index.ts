import { onUpdated, readonly, type ComponentInternalInstance } from 'vue';
import { useCounter } from '../useCounter';
import { getLifeCycleTarger } from '../../utils';

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
 */
export function useRenderCount(instance?: ComponentInternalInstance) {
    const { count, increment } = useCounter(0);

    onUpdated(increment, getLifeCycleTarger(instance));

    return readonly(count);
}