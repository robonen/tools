import { timestamp } from '@robonen/stdlib';
import { onBeforeMount, onBeforeUpdate, onMounted, onUpdated, readonly, ref, type ComponentInternalInstance } from 'vue';
import { useRenderCount } from '../useRenderCount';
import { getLifeCycleTarger } from '../..';

/**
 * @name useRenderInfo
 * @category Components
 * @description Returns information about the component's render count and the last time it was rendered
 * 
 * @param {ComponentInternalInstance} [instance] The component instance to track the render count for
 * 
 * 
 * @example
 * const { component, count, duration, lastRendered } = useRenderInfo();
 * 
 * @example
 * const { component, count, duration, lastRendered } = useRenderInfo(getCurrentInstance());
 * 
 * @since 0.0.1
 */
export function useRenderInfo(instance?: ComponentInternalInstance) {
    const target = getLifeCycleTarger(instance);
    const duration = ref(0);
    let renderStartTime = 0;

    const startMark = () => renderStartTime = performance.now();
    const endMark = () => {
        duration.value = Math.max(performance.now() - renderStartTime, 0);
        renderStartTime = 0;
    };

    onBeforeMount(startMark, target);
    onMounted(endMark, target);

    onBeforeUpdate(startMark, target);
    onUpdated(endMark, target);

    return {
        component: target?.type.name ?? target?.uid,
        count: useRenderCount(instance),
        duration: readonly(duration),
        lastRendered: timestamp(),
    };
}