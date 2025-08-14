import type { ComponentPublicInstance, MaybeRef, MaybeRefOrGetter } from 'vue';
import { toValue } from 'vue';

export type VueInstance = ComponentPublicInstance;
export type MaybeElement = HTMLElement | SVGElement | VueInstance | undefined | null;

export type MaybeElementRef<El extends MaybeElement = MaybeElement> = MaybeRef<El>;
export type MaybeComputedElementRef<El extends MaybeElement = MaybeElement> = MaybeRefOrGetter<El>;

export type UnRefElementReturn<T extends MaybeElement = MaybeElement> = T extends VueInstance ? Exclude<MaybeElement, VueInstance> : T | undefined;

export function unrefElement<El extends MaybeElement>(elRef: MaybeComputedElementRef<El>): UnRefElementReturn<El> {
  const plain = toValue(elRef);
  return (plain as VueInstance)?.$el ?? plain;
}