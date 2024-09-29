import { getCurrentInstance, type ComponentInternalInstance } from 'vue';

export function getLifeCycleTarger(target?: ComponentInternalInstance) {
    return target || getCurrentInstance();
}