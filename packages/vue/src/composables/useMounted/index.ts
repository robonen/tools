import { onMounted, readonly, ref, type ComponentInternalInstance } from 'vue';
import { getLifeCycleTarger } from '../..';

/**
 * @name useMounted
 * @category Components
 * @description Returns a ref that tracks the mounted state of the component (doesn't track the unmounted state)
 * 
 * @param {ComponentInternalInstance} [instance] The component instance to track the mounted state for
 * @returns {Readonly<Ref<boolean>>} The mounted state of the component
 * 
 * @example
 * const isMounted = useMounted();
 * 
 * @example
 * const isMounted = useMounted(getCurrentInstance());
 * 
 * @since 0.0.1
 */
export function useMounted(instance?: ComponentInternalInstance) {
  const isMounted = ref(false);
  const targetInstance = getLifeCycleTarger(instance);

  onMounted(() => isMounted.value = true, targetInstance);

  return readonly(isMounted);
}
