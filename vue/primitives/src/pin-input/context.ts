import type { ComputedRef, Ref } from 'vue';
import { useContextFactory } from '@robonen/vue';

export interface PinInputContext {
  value: Ref<string[]>;
  length: ComputedRef<number>;
  mask: ComputedRef<boolean>;
  otp: ComputedRef<boolean>;
  type: ComputedRef<'text' | 'number'>;
  disabled: ComputedRef<boolean>;
  placeholder: ComputedRef<string>;
  inputs: Ref<HTMLInputElement[]>;
  register: (el: HTMLInputElement) => void;
  unregister: (el: HTMLInputElement) => void;
  setAt: (index: number, char: string) => void;
  clearAt: (index: number) => void;
  focusIndex: (index: number) => void;
}

const ctx = useContextFactory<PinInputContext>('PinInputContext');

export const providePinInputContext = ctx.provide;
export const usePinInputContext = ctx.inject;
