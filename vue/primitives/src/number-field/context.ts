import type { Ref } from 'vue';
import { useContextFactory } from '@robonen/vue';

export interface NumberFieldContext {
  value: Ref<number | null>;
  min: Ref<number | undefined>;
  max: Ref<number | undefined>;
  step: Ref<number>;
  disabled: Ref<boolean>;
  readonly: Ref<boolean>;
  increment: (delta?: number) => void;
  decrement: (delta?: number) => void;
  setValue: (v: number | null) => void;
  inputId: string;
}

const ctx = useContextFactory<NumberFieldContext>('NumberFieldContext');

export const provideNumberFieldContext = ctx.provide;
export const useNumberFieldContext = ctx.inject;
