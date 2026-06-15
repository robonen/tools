import type { Ref } from 'vue';
import { useContextFactory } from '@robonen/vue';

export type CheckedState = boolean | 'indeterminate';

/**
 * Values a checkbox can carry through a group model or a hidden form input. A
 * plain boolean checkbox uses `boolean`, but `trueValue`/`falseValue` and group
 * membership accept arbitrary primitives or plain objects.
 */
export type AcceptableValue = string | number | boolean | Record<string, unknown> | null;

export interface CheckboxContext {
  checked: Ref<CheckedState>;
  disabled: Ref<boolean>;
}

const ctx = useContextFactory<CheckboxContext>('CheckboxContext');

export const provideCheckboxContext = ctx.provide;
export const useCheckboxContext = ctx.inject;

/**
 * Context published by `CheckboxGroupRoot`. A `CheckboxRoot` injects it with a
 * `null` fallback; when present it switches to group mode — its checked state
 * comes from membership in `modelValue` and toggling pushes/splices its `value`.
 */
export interface CheckboxGroupContext {
  modelValue: Ref<AcceptableValue[]>;
  disabled: Ref<boolean>;
  rovingFocus: Ref<boolean>;
  toggle: (value: AcceptableValue) => void;
  isChecked: (value: AcceptableValue) => boolean;
}

const groupCtx = useContextFactory<CheckboxGroupContext>('CheckboxGroupContext');

export const provideCheckboxGroupContext = groupCtx.provide;
export const useCheckboxGroupContext = groupCtx.inject;
