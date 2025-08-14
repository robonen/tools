import type { ComponentPublicInstance, MaybeRef, MaybeRefOrGetter } from 'vue';
import { toValue } from 'vue';

export type VueInstance = ComponentPublicInstance;
export type MaybeElement = HTMLElement | SVGElement | VueInstance | undefined | null;

export type MaybeElementRef<El extends MaybeElement = MaybeElement> = MaybeRef<El>;
export type MaybeComputedElementRef<El extends MaybeElement = MaybeElement> = MaybeRefOrGetter<El>;

export type UnRefElementReturn<T extends MaybeElement = MaybeElement> = T extends VueInstance ? Exclude<MaybeElement, VueInstance> : T | undefined;

/**
 * @name unrefElement
 * @category Components
 * @description Unwraps a Vue element reference to get the underlying instance or DOM element.
 *
 * @param {MaybeComputedElementRef<El>} elRef - The element reference to unwrap.
 * @returns {UnRefElementReturn<El>} - The unwrapped element or undefined.
 *
 * @example
 * const element = useTemplateRef<HTMLElement>('element');
 * const result = unrefElement(element); // result is the element instance
 *
 * @example
 * const component = useTemplateRef<Component>('component');
 * const result = unrefElement(component); // result is the component instance
 * 
 * @since 0.0.11
 */
export function unrefElement<El extends MaybeElement>(elRef: MaybeComputedElementRef<El>): UnRefElementReturn<El> {
  const plain = toValue(elRef);
  return (plain as VueInstance)?.$el ?? plain;
}