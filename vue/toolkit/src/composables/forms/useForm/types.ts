import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue';
import type { StandardSchemaV1 } from '@/types';

/**
 * Values that cannot be descended into when building field paths.
 */
type FieldPrimitive
  = | string
    | number
    | boolean
    | bigint
    | symbol
    | null
    | undefined
    | Date
    | RegExp
    | ((...args: any[]) => any);

/**
 * Union of every dot-separated path into `T` (including array indices), e.g.
 * `'email' | 'address' | 'address.city' | 'tags.0'`.
 */
export type FieldPath<T> = T extends FieldPrimitive
  ? never
  : T extends ReadonlyArray<infer U>
    ? `${number}` | `${number}.${FieldPath<U>}`
    : {
        [K in keyof T & (string | number)]: T[K] extends FieldPrimitive
          ? `${K}`
          : `${K}` | `${K}.${FieldPath<T[K]>}`;
      }[keyof T & (string | number)];

/**
 * The value type at a given {@link FieldPath} of `T`.
 */
export type FieldPathValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? FieldPathValue<T[K], Rest>
    : T extends ReadonlyArray<infer U>
      ? FieldPathValue<U, Rest>
      : unknown
  : P extends keyof T
    ? T[P]
    : T extends ReadonlyArray<infer U>
      ? U
      : unknown;

/**
 * A recursively-partial version of `T` (used for `initialValues`/`setValues`).
 */
export type PartialDeep<T> = T extends FieldPrimitive
  ? T
  : T extends ReadonlyArray<infer U>
    ? Array<PartialDeep<U>>
    : { [K in keyof T]?: PartialDeep<T[K]> };

/**
 * When validation runs for a field/form.
 * - `value` — on every value change
 * - `blur` — when the field is blurred
 * - `submit` — only on submit
 * - `manual` — never automatically; only via `validate()`/`validateField()`
 */
export type ValidationTrigger = 'value' | 'blur' | 'submit' | 'manual';

/**
 * Flat map of field path → error messages.
 */
export type FormErrors = Record<string, string[]>;

/**
 * The value a field-level function validator may return. A `string`/`string[]`
 * is treated as error message(s); `true`/`void`/`null`/`undefined` means valid.
 */
export type FieldValidationResult = string | string[] | true | void | null | undefined;

/**
 * A field-level function validator.
 */
export type FieldValidator<T = any, TInput extends object = any>
  = (value: T, values: TInput) => FieldValidationResult | Promise<FieldValidationResult>;

/**
 * A custom form-level resolver (alternative to a Standard Schema).
 */
export type FormResolver<TInput extends object, TOutput = TInput>
  = (values: TInput) => FormResolverResult<TOutput> | Promise<FormResolverResult<TOutput>>;

/**
 * The shape returned by a {@link FormResolver}.
 */
export interface FormResolverResult<TOutput> {
  /**
   * The (optionally transformed) valid output. Read on success.
   */
  values?: TOutput;
  /**
   * Flat map of path → messages. Empty/absent means valid.
   */
  errors?: FormErrors;
}

/**
 * The outcome of running form validation.
 */
export interface FormValidationResult<TOutput> {
  /**
   * Whether the form is valid (no errors).
   */
  valid: boolean;
  /**
   * The flat error map produced by this run.
   */
  errors: FormErrors;
  /**
   * The typed, validated output (present only when `valid`).
   */
  output?: TOutput;
}

/**
 * The outcome of validating a single field.
 */
export interface FieldValidationResultDetail {
  /**
   * Whether the field is valid.
   */
  valid: boolean;
  /**
   * The field's error messages (empty when valid).
   */
  errors: string[];
}

/**
 * Reactive meta flags describing the whole form.
 */
export interface FormMeta {
  /**
   * Whether any value differs from its initial snapshot.
   */
  dirty: boolean;
  /**
   * Whether the form currently has no errors.
   */
  valid: boolean;
  /**
   * Whether any field has been touched.
   */
  touched: boolean;
  /**
   * Whether a validation run is in flight.
   */
  pending: boolean;
}

/**
 * Reactive meta flags describing a single field.
 */
export interface FieldMeta {
  /**
   * Whether the field's value differs from its initial snapshot.
   */
  dirty: ComputedRef<boolean>;
  /**
   * Whether the field has been touched (blurred).
   */
  touched: ComputedRef<boolean>;
  /**
   * Whether the field currently has no errors.
   */
  valid: ComputedRef<boolean>;
}

/**
 * Props to spread onto a native field element (via `v-bind`).
 */
export interface FieldBindingProps {
  /**
   * The field's dotted path, suitable as the input `name`.
   */
  name: string;
  /**
   * Blur handler that marks the field touched and (re)validates per trigger.
   */
  onBlur: (event?: Event) => void;
  /**
   * `true` when the field currently has errors, for `aria-invalid`.
   */
  'aria-invalid': boolean | undefined;
}

/**
 * Options for {@link UseFormOptions}'s value-write helpers.
 */
export interface SetValueOptions {
  /**
   * Whether to (re)validate after the write. Defaults to the form's trigger config.
   */
  shouldValidate?: boolean;
  /**
   * Whether to mark the field touched. Defaults to `false`.
   */
  shouldTouch?: boolean;
}

/**
 * State accepted by `resetForm`.
 */
export interface FormResetState<TInput extends object> {
  /**
   * New baseline values (defaults to the original initial values).
   */
  values?: PartialDeep<TInput>;
  /**
   * New touched map (defaults to empty).
   */
  touched?: Record<string, boolean>;
  /**
   * New error map (defaults to empty).
   */
  errors?: FormErrors;
}

/**
 * The success callback for `handleSubmit`.
 */
export type SubmissionHandler<TOutput> = (values: TOutput, event?: Event) => void | Promise<void>;

/**
 * The invalid callback for `handleSubmit`.
 */
export type InvalidSubmissionHandler = (errors: FormErrors, event?: Event) => void;

/**
 * Options for {@link useForm}.
 */
export interface UseFormOptions<TInput extends object, TOutput = TInput> {
  /**
   * Initial form values (ref/getter supported; cloned on init).
   */
  initialValues?: MaybeRefOrGetter<PartialDeep<TInput>>;
  /**
   * A Standard Schema (zod/valibot/arktype/…) validating the whole form.
   */
  schema?: StandardSchemaV1<TInput, TOutput>;
  /**
   * A custom form-level resolver (alternative to `schema`).
   */
  resolver?: FormResolver<TInput, TOutput>;
  /**
   * Validate once on mount.
   *
   * @default false
   */
  validateOnMount?: boolean;
  /**
   * When to validate before the first submit.
   *
   * @default 'submit'
   */
  validateOn?: ValidationTrigger;
  /**
   * When to validate after the first submit (or after a field is touched).
   *
   * @default 'value'
   */
  revalidateOn?: ValidationTrigger;
}

/**
 * The form instance returned by {@link useForm} (and injected by
 * {@link useFormContext}). Also serves as the context shared with fields.
 */
export interface FormContext<TInput extends object = any, TOutput = TInput> {
  /**
   * Reactive form values. Bind directly with `v-model="values.path"`.
   */
  values: TInput;
  /**
   * Flat, reactive map of path → error messages.
   */
  errors: ComputedRef<FormErrors>;
  /**
   * Grouped reactive meta flags for the whole form.
   */
  meta: ComputedRef<FormMeta>;

  /**
   * Whether any value differs from the initial snapshot.
   */
  isDirty: ComputedRef<boolean>;
  /**
   * Whether the form has no errors.
   */
  isValid: ComputedRef<boolean>;
  /**
   * Whether a validation run is in flight.
   */
  isValidating: Readonly<Ref<boolean>>;
  /**
   * Whether a submit is in flight.
   */
  isSubmitting: Readonly<Ref<boolean>>;
  /**
   * Number of times submit has been attempted.
   */
  submitCount: Readonly<Ref<number>>;

  /**
   * Read a field value by path.
   */
  getFieldValue: <P extends FieldPath<TInput>>(path: P) => FieldPathValue<TInput, P>;
  /**
   * The first error message for a path, if any.
   */
  getError: (path: FieldPath<TInput>) => string | undefined;
  /**
   * All error messages for a path (empty array when none).
   */
  getErrors: (path: FieldPath<TInput>) => string[];
  /**
   * Whether a field differs from its initial snapshot.
   */
  isFieldDirty: (path: FieldPath<TInput>) => boolean;
  /**
   * Whether a field has been touched.
   */
  isFieldTouched: (path: FieldPath<TInput>) => boolean;
  /**
   * Whether a field currently has no errors.
   */
  isFieldValid: (path: FieldPath<TInput>) => boolean;

  /**
   * Write a field value by path.
   */
  setFieldValue: <P extends FieldPath<TInput>>(
    path: P,
    value: FieldPathValue<TInput, P>,
    options?: SetValueOptions,
  ) => void;
  /**
   * Merge or replace multiple values at once.
   */
  setValues: (values: PartialDeep<TInput>, options?: { merge?: boolean }) => void;
  /**
   * Set or clear (with `null`) a field's error messages.
   */
  setFieldError: (path: FieldPath<TInput>, message: string | string[] | null) => void;
  /**
   * Replace the entire error map.
   */
  setErrors: (errors: FormErrors) => void;
  /**
   * Mark a field touched/untouched.
   */
  setFieldTouched: (path: FieldPath<TInput>, touched?: boolean) => void;
  /**
   * Mark all known fields touched/untouched.
   */
  setTouched: (touched?: boolean) => void;

  /**
   * Validate the whole form.
   */
  validate: () => Promise<FormValidationResult<TOutput>>;
  /**
   * Validate a single field (runs the pipeline, updates that field's errors).
   */
  validateField: (path: FieldPath<TInput>) => Promise<FieldValidationResultDetail>;

  /**
   * Reset the form to its initial (or provided) state.
   */
  resetForm: (state?: FormResetState<TInput>) => void;
  /**
   * Reset a single field to its initial (or provided) value.
   */
  resetField: <P extends FieldPath<TInput>>(path: P, value?: FieldPathValue<TInput, P>) => void;

  /**
   * Wrap a submit callback: validates, then calls `onValid` with typed output
   * (or `onInvalid` with the error map).
   */
  handleSubmit: (
    onValid: SubmissionHandler<TOutput>,
    onInvalid?: InvalidSubmissionHandler,
  ) => (event?: Event) => Promise<void>;
  /**
   * Reset handler suitable for a `<form>`'s `reset` event.
   */
  handleReset: (event?: Event) => void;

  /**
   * Bind a field inline: returns `[model, props]` for `v-model` + `v-bind`.
   */
  defineField: <P extends FieldPath<TInput>>(
    path: P,
    options?: DefineFieldOptions<FieldPathValue<TInput, P>, TInput>,
  ) => [Ref<FieldPathValue<TInput, P>>, ComputedRef<FieldBindingProps>];

  /**
   * Props to spread on the `<form>` element (`@submit`/`@reset`/`novalidate`).
   */
  formProps: {
    onSubmit: (event: Event) => void;
    onReset: (event: Event) => void;
    novalidate: boolean;
  };

  /**
   * @internal Register a field-level validator for a path (used by `useField`).
   */
  _registerValidator: (path: string, validator: FieldValidator) => void;
  /**
   * @internal Unregister a field-level validator for a path.
   */
  _unregisterValidator: (path: string, validator: FieldValidator) => void;
  /**
   * @internal Whether validation should run for a given trigger right now.
   */
  _shouldValidate: (trigger: Exclude<ValidationTrigger, 'manual'>) => boolean;
  /**
   * @internal Re-key error/touched entries under `basePath` after an array
   * reorder. `indexMap` maps an old array index to its new index, or `null`
   * to drop it (removal). Used by `useFieldArray`.
   */
  _remapFieldPaths: (basePath: string, indexMap: (index: number) => number | null) => void;
}

/**
 * Alias: the public return of {@link useForm} is the form context itself.
 */
export type UseFormReturn<TInput extends object = any, TOutput = TInput> = FormContext<TInput, TOutput>;

/**
 * Options for `defineField`.
 */
export interface DefineFieldOptions<T = any, TInput extends object = any> {
  /**
   * A field-level function validator.
   */
  validate?: FieldValidator<T, TInput>;
  /**
   * Override the form's validation trigger for this field.
   */
  validateOn?: ValidationTrigger;
}

/**
 * Options for {@link useField}.
 */
export interface UseFieldOptions<T, TInput extends object = any> {
  /**
   * The form to bind to. Defaults to the injected form context; if there is
   * none and `initialValue` is given, the field runs standalone.
   */
  form?: FormContext<TInput>;
  /**
   * Initial value for standalone mode (no form context).
   */
  initialValue?: T;
  /**
   * A field-level function validator.
   */
  validate?: FieldValidator<T, TInput>;
  /**
   * A per-field Standard Schema (standalone or augmenting the form schema).
   */
  schema?: StandardSchemaV1<T>;
  /**
   * Override the form's validation trigger for this field.
   */
  validateOn?: ValidationTrigger;
}

/**
 * The reactive API returned by {@link useField}.
 */
export interface UseFieldReturn<T> {
  /**
   * The field's writable value (bound to the form path, or local in standalone).
   */
  value: Ref<T>;
  /**
   * The field's error messages.
   */
  errors: ComputedRef<string[]>;
  /**
   * The field's first error message, if any.
   */
  errorMessage: ComputedRef<string | undefined>;
  /**
   * Grouped reactive meta for the field.
   */
  meta: FieldMeta;
  /**
   * Blur handler — marks touched and (re)validates per trigger.
   */
  handleBlur: (event?: Event) => void;
  /**
   * Set the value and optionally validate.
   */
  handleChange: (value: T, shouldValidate?: boolean) => void;
  /**
   * `input`/`change` DOM handler for native elements.
   */
  handleInput: (event: Event) => void;
  /**
   * Set the field value programmatically.
   */
  setValue: (value: T) => void;
  /**
   * Mark the field touched/untouched.
   */
  setTouched: (touched?: boolean) => void;
  /**
   * Set or clear (with `null`) the field's errors.
   */
  setErrors: (message: string | string[] | null) => void;
  /**
   * Validate just this field.
   */
  validate: () => Promise<FieldValidationResultDetail>;
  /**
   * Reset the field to its initial value.
   */
  reset: () => void;
  /**
   * Props to spread on the field element (`v-bind="attrs"`).
   */
  attrs: ComputedRef<FieldBindingProps>;
}

/**
 * One entry of a {@link useFieldArray}.
 */
export interface FieldArrayEntry<T> {
  /**
   * A stable key for `v-for`, preserved across reorders.
   */
  key: number;
  /**
   * The item's writable value (bound to the array slot).
   */
  value: Ref<T>;
  /**
   * Whether this is the first entry.
   */
  isFirst: boolean;
  /**
   * Whether this is the last entry.
   */
  isLast: boolean;
}

/**
 * The API returned by {@link useFieldArray}.
 */
export interface UseFieldArrayReturn<T> {
  /**
   * The reactive list of entries with stable keys.
   */
  fields: Readonly<Ref<Array<FieldArrayEntry<T>>>>;
  /**
   * Append an item.
   */
  push: (value: T) => void;
  /**
   * Prepend an item.
   */
  prepend: (value: T) => void;
  /**
   * Insert an item at an index.
   */
  insert: (index: number, value: T) => void;
  /**
   * Remove the item at an index.
   */
  remove: (index: number) => void;
  /**
   * Move an item from one index to another.
   */
  move: (from: number, to: number) => void;
  /**
   * Swap two items.
   */
  swap: (indexA: number, indexB: number) => void;
  /**
   * Replace the whole array.
   */
  replace: (values: T[]) => void;
  /**
   * Replace a single item.
   */
  update: (index: number, value: T) => void;
}

/**
 * Options for {@link useFieldArray}.
 */
export interface UseFieldArrayOptions<TInput extends object = any> {
  /**
   * The form to bind to. Defaults to the injected form context.
   */
  form?: FormContext<TInput>;
}
