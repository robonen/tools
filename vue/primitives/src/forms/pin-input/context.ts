import type { ComputedRef, Ref } from 'vue';
import type { Direction } from '../../utilities/config-provider';
import { useContextFactory } from '@robonen/vue';

export interface PinInputContext {
  value: Ref<string[]>;
  length: ComputedRef<number>;
  mask: ComputedRef<boolean>;
  otp: ComputedRef<boolean>;
  type: ComputedRef<'text' | 'number'>;
  disabled: ComputedRef<boolean>;
  placeholder: ComputedRef<string>;
  dir: ComputedRef<Direction>;
  isComplete: ComputedRef<boolean>;
  inputs: Ref<HTMLInputElement[]>;
  register: (el: HTMLInputElement) => void;
  unregister: (el: HTMLInputElement) => void;
  setAt: (index: number, char: string) => void;
  clearAt: (index: number) => void;
  focusIndex: (index: number) => void;
  /**
   * Move focus relative to `index` by `delta` (`±1`) or to an absolute edge,
   * skipping disabled cells. RTL-aware navigation is resolved by the caller.
   */
  focusRelative: (index: number, delta: number, absolute?: 'home' | 'end') => void;
  /** Index of the first cell whose value is still empty, or `-1` if all filled. */
  firstEmptyIndex: () => number;
}

const ctx = useContextFactory<PinInputContext>('PinInputContext');

export const providePinInputContext = ctx.provide;
export const usePinInputContext = ctx.inject;
