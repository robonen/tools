import { getCurrentInstance, type ComponentInternalInstance } from 'vue';

/**
 * @name getLifeCycleTarger
 * @category Utils
 * @description Function to get the target instance of the lifecycle hook
 * 
 * @param {ComponentInternalInstance} target The target instance of the lifecycle hook
 * @returns {ComponentInternalInstance | null} Instance of the lifecycle hook or null
 * 
 * @example
 * const target = getLifeCycleTarger();
 * 
 * @example
 * const target = getLifeCycleTarger(instance);
 * 
 * @since 0.0.1
 */
export function getLifeCycleTarger(target?: ComponentInternalInstance) {
    return target || getCurrentInstance();
}