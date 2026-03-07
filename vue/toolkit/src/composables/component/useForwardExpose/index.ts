import type { ComponentPublicInstance, Ref } from 'vue';
import { computed, getCurrentInstance, shallowRef } from 'vue';
import type { MaybeElement } from '../unrefElement';
import { unrefElement } from '../unrefElement';

/** Set of non-element node names that should be skipped when resolving `$el` */
const NON_ELEMENT_NODES = new Set(['#text', '#comment']);

export interface UseForwardExposeReturn<T extends ComponentPublicInstance> {
  /** Callback to set as `:ref` — forwards child's exposed API and `$el` through the parent */
  forwardRef: (ref: T | MaybeElement) => void;
  /** Reactive reference to the forwarded element or component instance */
  currentRef: Ref<T | MaybeElement>;
  /** Computed property resolving to the underlying `HTMLElement`, skipping text/comment nodes */
  currentElement: Readonly<Ref<HTMLElement | undefined>>;
}

/**
 * @name useForwardExpose
 * @category Component
 * @description Forwards a child component's exposed API and DOM element (`$el`) through
 * the parent component. Useful for wrapper / headless components that need to transparently
 * proxy the inner component's ref to the consumer.
 *
 * Merges the parent's own props and any prior `expose()` bindings onto `instance.exposed`,
 * then updates them when `forwardRef` is called with a child element or component instance.
 *
 * @returns {UseForwardExposeReturn<T>} An object with `forwardRef`, `currentRef`, and `currentElement`
 *
 * @example
 * const { forwardRef, currentElement } = useForwardExpose();
 * // Template: <ChildComponent :ref="forwardRef" />
 *
 * @example
 * const { forwardRef, currentRef } = useForwardExpose<InstanceType<typeof MyInput>>();
 * // Template: <MyInput :ref="forwardRef" />
 * // currentRef.value exposes MyInput's public API
 *
 * @since 0.0.14
 */
export function useForwardExpose<T extends ComponentPublicInstance>(): UseForwardExposeReturn<T> {
  const instance = getCurrentInstance()!;

  const currentRef = shallowRef<T | MaybeElement>();
  const currentElement = computed<HTMLElement | undefined>(() => {
    // @ts-expect-error — $el exists on component instances but not on HTMLElement/SVGElement
    const el = currentRef.value?.$el;

    return NON_ELEMENT_NODES.has(el?.nodeName)
      ? (el.nextElementSibling as HTMLElement | undefined) ?? undefined
      : (unrefElement(currentRef) as HTMLElement | undefined);
  });

  // localExpose should only be assigned once else will create infinite loop
  const localExpose = instance.exposed;
  const ret: Record<string, any> = {};

  // Collect all property descriptors in a single pass
  const descriptors: PropertyDescriptorMap = {};

  for (const key in instance.props) {
    descriptors[key] = {
      enumerable: true,
      configurable: true,
      get: () => instance.props[key],
    };
  }

  if (localExpose && Object.keys(localExpose).length > 0) {
    for (const key in localExpose) {
      descriptors[key] = {
        enumerable: true,
        configurable: true,
        get: () => localExpose[key],
      };
    }
  }

  descriptors['$el'] = {
    enumerable: true,
    configurable: true,
    get: () => instance.vnode.el,
  };

  Object.defineProperties(ret, descriptors);
  instance.exposed = ret;

  function forwardRef(ref: T | MaybeElement) {
    currentRef.value = ref;
    if (!ref) return;

    const $elDescriptor: PropertyDescriptor = {
      enumerable: true,
      configurable: true,
      get: () => (ref instanceof Element ? ref : ref.$el),
    };

    // Keep ret in sync — it's the source of descriptors for future rebuilds
    Object.defineProperty(ret, '$el', $elDescriptor);

    // Also update current instance.exposed if it has diverged from ret
    if (instance.exposed && instance.exposed !== ret) {
      Object.defineProperty(instance.exposed, '$el', $elDescriptor);
    }

    if (!(ref instanceof Element) && !Object.prototype.hasOwnProperty.call(ref, '$el')) {
      const childExposed = ref.$.exposed;

      if (childExposed) {
        // Copy descriptors from ret (includes props, prior expose, $el)
        const allDescriptors = Object.getOwnPropertyDescriptors(ret);
        allDescriptors['$el'] = $elDescriptor;

        for (const key in childExposed) {
          allDescriptors[key] = {
            enumerable: true,
            configurable: true,
            get: () => childExposed[key],
          };
        }

        instance.exposed = Object.defineProperties({}, allDescriptors);
      }
    }
  }

  return { forwardRef, currentRef, currentElement };
}
