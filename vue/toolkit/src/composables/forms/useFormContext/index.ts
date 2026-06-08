import { injectFormContext } from '../useForm/context';
import type { UseFormReturn } from '../useForm';

/**
 * @name useFormContext
 * @category Forms
 * @description Retrieve the {@link useForm} instance provided by an ancestor, for
 * building field components that live anywhere in the form's subtree. Returns
 * `null` when no form has been provided (so callers can support standalone use).
 *
 * @returns {UseFormReturn | null} The injected form instance, or `null`
 *
 * @example
 * // Inside a custom <TextField> rendered within a useForm() component:
 * const form = useFormContext();
 * if (form)
 *   form.setFieldValue('email', 'a@b.com');
 *
 * @since 0.0.16
 */
export function useFormContext<TInput extends object = any, TOutput = TInput>(): UseFormReturn<TInput, TOutput> | null {
  return injectFormContext<TInput, TOutput>();
}
