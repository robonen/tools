import { computed, reactive, readonly, ref, toValue } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import { get, isEqual, isObject, set, toArray } from '@robonen/stdlib';
import { cloneFnDefault } from '@/composables/reactivity/useCloned';
import { tryOnMounted } from '@/composables/lifecycle/tryOnMounted';
import { provideFormContext } from './context';
import { normalizeFieldResult, runStandardSchema } from './validation';
import type {
  FieldBindingProps,
  FieldPath,
  FieldPathValue,
  FieldValidationResultDetail,
  FieldValidator,
  FormErrors,
  FormMeta,
  FormResetState,
  FormValidationResult,
  InvalidSubmissionHandler,
  PartialDeep,
  SetValueOptions,
  SubmissionHandler,
  UseFormOptions,
  UseFormReturn,
  ValidationTrigger,
} from './types';

export type {
  FieldArrayEntry,
  FieldBindingProps,
  FieldMeta,
  FieldPath,
  FieldPathValue,
  FieldValidationResult,
  FieldValidationResultDetail,
  FieldValidator,
  FormContext,
  FormErrors,
  FormMeta,
  FormResetState,
  FormResolver,
  FormResolverResult,
  FormValidationResult,
  InvalidSubmissionHandler,
  PartialDeep,
  SetValueOptions,
  SubmissionHandler,
  UseFieldArrayOptions,
  UseFieldArrayReturn,
  UseFieldOptions,
  UseFieldReturn,
  UseFormOptions,
  UseFormReturn,
  ValidationTrigger,
} from './types';

/**
 * Recursively assign `source` into the reactive `target`, deep-merging plain
 * objects and cloning leaf values so callers can't share mutable references.
 */
function deepAssign(target: Record<string, any>, source: Record<string, any>): void {
  for (const key of Object.keys(source)) {
    const value = source[key];
    const current = target[key];

    if (isObject(value) && isObject(current))
      deepAssign(current, value);
    else
      target[key] = cloneFnDefault(value);
  }
}

/**
 * @name useForm
 * @category Forms
 * @description Headless, performant form state management. Holds reactive `values`,
 * flat path-keyed `errors`/touched maps, derived `meta`, and a full set of
 * mutation/validation/submit/reset helpers. Validation accepts a
 * [Standard Schema](https://github.com/standard-schema/standard-schema)
 * (zod/valibot/arktype), a custom resolver, or per-field function validators.
 *
 * @param {UseFormOptions} [options={}] Initial values, schema/resolver, and validation triggers
 * @returns {UseFormReturn} The reactive form instance (also provided to descendant fields)
 *
 * @example
 * const { values, errors, handleSubmit } = useForm({
 *   initialValues: { email: '', age: 0 },
 *   schema: z.object({ email: z.string().email(), age: z.number().min(18) }),
 * });
 * const onSubmit = handleSubmit((output) => save(output));
 *
 * @example
 * // Inline binding with defineField
 * const form = useForm({ initialValues: { name: '' } });
 * const [name, nameProps] = form.defineField('name');
 * // <input v-model="name" v-bind="nameProps">
 *
 * @since 0.0.16
 */
export function useForm<TInput extends object, TOutput = TInput>(
  options: UseFormOptions<TInput, TOutput> = {},
): UseFormReturn<TInput, TOutput> {
  const {
    schema,
    resolver,
    validateOnMount = false,
    validateOn = 'submit',
    revalidateOn = 'value',
  } = options;

  // Cloned snapshot of the initial values, used as the dirty/reset baseline.
  let initialSnapshot = cloneFnDefault((toValue(options.initialValues) ?? {}) as PartialDeep<TInput>);

  const values = reactive(cloneFnDefault(initialSnapshot) as object) as TInput;
  const errorsMap = ref<FormErrors>({});
  const touchedMap = reactive<Record<string, boolean>>({});

  const isValidating = ref(false);
  const isSubmitting = ref(false);
  const submitCount = ref(0);

  // Field-level function validators registered by useField/defineField.
  const fieldValidators = new Map<string, Set<FieldValidator>>();
  // Every path a field has been declared for (drives setTouched("all")).
  const knownFields = new Set<string>();

  function readPath(path: string): any {
    return get(values as any, path);
  }

  // ---- derived state ----------------------------------------------------

  const errors = computed<FormErrors>(() => errorsMap.value);
  const isValid = computed<boolean>(() => Object.keys(errorsMap.value).length === 0);
  const isDirty = computed<boolean>(() => !isEqual(values, initialSnapshot));
  const isTouched = computed<boolean>(() => Object.values(touchedMap).some(Boolean));

  const meta = computed<FormMeta>(() => ({
    dirty: isDirty.value,
    valid: isValid.value,
    touched: isTouched.value,
    pending: isValidating.value,
  }));

  // ---- trigger gating ---------------------------------------------------

  function effectiveTrigger(override?: ValidationTrigger): ValidationTrigger {
    return override ?? (submitCount.value > 0 ? revalidateOn : validateOn);
  }

  function shouldValidate(event: 'value' | 'blur', override?: ValidationTrigger): boolean {
    const trigger = effectiveTrigger(override);
    if (trigger === 'manual' || trigger === 'submit')
      return false;
    if (trigger === 'value')
      return true;
    return event === 'blur';
  }

  // ---- validation pipeline ---------------------------------------------

  let validationSeq = 0;

  async function runValidation(): Promise<FormValidationResult<TOutput>> {
    // Validate against the live reactive `values` — schema/resolver/validators
    // only READ it — so there is no deep clone on every keystroke. A plain
    // snapshot is materialised only for the (schemaless) success output.
    let resultErrors: FormErrors = {};
    let output: TOutput | undefined;

    if (schema) {
      const run = await runStandardSchema(schema, values);
      resultErrors = run.errors;
      output = run.output;
    }
    else if (resolver) {
      const run = await resolver(values as TInput);
      resultErrors = run.errors ?? {};
      output = run.values;
    }

    // Merge per-field function validators on top of schema/resolver errors.
    for (const [path, validators] of fieldValidators) {
      for (const validator of validators) {
        const messages = normalizeFieldResult(await validator(get(values as any, path), values as TInput));
        if (messages.length > 0)
          (resultErrors[path] ??= []).push(...messages);
      }
    }

    const valid = Object.keys(resultErrors).length === 0;

    return {
      valid,
      errors: resultErrors,
      output: valid ? (output ?? (cloneFnDefault(values) as unknown as TOutput)) : undefined,
    };
  }

  async function validate(): Promise<FormValidationResult<TOutput>> {
    const seq = ++validationSeq;
    isValidating.value = true;

    try {
      const result = await runValidation();
      // Apply only if this is still the latest run (drop stale async results).
      if (seq === validationSeq)
        errorsMap.value = result.errors;
      return result;
    }
    finally {
      if (seq === validationSeq)
        isValidating.value = false;
    }
  }

  async function validateField(path: FieldPath<TInput>): Promise<FieldValidationResultDetail> {
    const result = await validate();
    const fieldErrors = result.errors[path as string] ?? [];
    return { valid: fieldErrors.length === 0, errors: fieldErrors };
  }

  // ---- queries ----------------------------------------------------------

  function getFieldValue<P extends FieldPath<TInput>>(path: P): FieldPathValue<TInput, P> {
    return readPath(path as string) as FieldPathValue<TInput, P>;
  }

  function getErrors(path: FieldPath<TInput>): string[] {
    return errorsMap.value[path as string] ?? [];
  }

  function getError(path: FieldPath<TInput>): string | undefined {
    return getErrors(path)[0];
  }

  function isFieldDirty(path: FieldPath<TInput>): boolean {
    return !isEqual(readPath(path as string), get(initialSnapshot as any, path as string));
  }

  function isFieldTouched(path: FieldPath<TInput>): boolean {
    return touchedMap[path as string] === true;
  }

  function isFieldValid(path: FieldPath<TInput>): boolean {
    return getErrors(path).length === 0;
  }

  // ---- mutations --------------------------------------------------------

  function setFieldValue<P extends FieldPath<TInput>>(
    path: P,
    value: FieldPathValue<TInput, P>,
    setOptions?: SetValueOptions,
  ): void {
    set(values as any, path as string, value);

    if (setOptions?.shouldTouch) {
      touchedMap[path as string] = true;
      knownFields.add(path as string);
    }

    const should = setOptions?.shouldValidate ?? shouldValidate('value');
    if (should)
      void validate();
  }

  function setValues(next: PartialDeep<TInput>, setOptions?: { merge?: boolean }): void {
    const merge = setOptions?.merge ?? true;

    if (!merge) {
      for (const key of Object.keys(values as object))
        delete (values as Record<string, unknown>)[key];
    }

    deepAssign(values as Record<string, any>, next as Record<string, any>);

    if (shouldValidate('value'))
      void validate();
  }

  function setFieldError(path: FieldPath<TInput>, message: string | string[] | null): void {
    if (message === null) {
      delete errorsMap.value[path as string];
      return;
    }

    errorsMap.value[path as string] = toArray(message);
  }

  function setErrors(next: FormErrors): void {
    errorsMap.value = { ...next };
  }

  function setFieldTouched(path: FieldPath<TInput>, touched = true): void {
    touchedMap[path as string] = touched;
    knownFields.add(path as string);
  }

  function setTouched(touched = true): void {
    for (const path of knownFields)
      touchedMap[path] = touched;
  }

  // ---- reset ------------------------------------------------------------

  function resetForm(state?: FormResetState<TInput>): void {
    if (state?.values !== undefined)
      initialSnapshot = cloneFnDefault(state.values);

    for (const key of Object.keys(values as object))
      delete (values as Record<string, unknown>)[key];
    deepAssign(values as Record<string, any>, initialSnapshot as Record<string, any>);

    errorsMap.value = state?.errors ? { ...state.errors } : {};

    for (const key of Object.keys(touchedMap))
      delete touchedMap[key];
    if (state?.touched) {
      for (const [key, value] of Object.entries(state.touched))
        touchedMap[key] = value;
    }

    submitCount.value = 0;
  }

  function resetField<P extends FieldPath<TInput>>(path: P, value?: FieldPathValue<TInput, P>): void {
    const next = value !== undefined ? value : get(initialSnapshot as any, path as string);
    set(values as any, path as string, cloneFnDefault(next));
    delete errorsMap.value[path as string];
    delete touchedMap[path as string];
  }

  // ---- handlers ---------------------------------------------------------

  function handleSubmit(
    onValid: SubmissionHandler<TOutput>,
    onInvalid?: InvalidSubmissionHandler,
  ): (event?: Event) => Promise<void> {
    return async (event?: Event) => {
      event?.preventDefault?.();
      submitCount.value += 1;
      isSubmitting.value = true;

      try {
        const result = await validate();

        if (result.valid) {
          await onValid(result.output as TOutput, event);
        }
        else {
          for (const path of Object.keys(result.errors)) {
            touchedMap[path] = true;
            knownFields.add(path);
          }
          onInvalid?.(result.errors, event);
        }
      }
      finally {
        isSubmitting.value = false;
      }
    };
  }

  function handleReset(event?: Event): void {
    event?.preventDefault?.();
    resetForm();
  }

  function remapFieldPaths(basePath: string, indexMap: (index: number) => number | null): void {
    const prefix = `${basePath}.`;

    const rewriteKey = (key: string): string | null => {
      if (!key.startsWith(prefix))
        return key;

      const rest = key.slice(prefix.length);
      const dot = rest.indexOf('.');
      const index = Number(dot === -1 ? rest : rest.slice(0, dot));
      if (!Number.isInteger(index))
        return key;

      const mapped = indexMap(index);
      if (mapped === null)
        return null;

      return `${prefix}${mapped}${dot === -1 ? '' : rest.slice(dot)}`;
    };

    const nextErrors: FormErrors = {};
    for (const key of Object.keys(errorsMap.value)) {
      const mappedKey = rewriteKey(key);
      if (mappedKey !== null)
        nextErrors[mappedKey] = errorsMap.value[key]!;
    }
    errorsMap.value = nextErrors;

    const touchedEntries = Object.entries(touchedMap);
    for (const key of Object.keys(touchedMap))
      delete touchedMap[key];
    for (const [key, value] of touchedEntries) {
      const mappedKey = rewriteKey(key);
      if (mappedKey !== null)
        touchedMap[mappedKey] = value;
    }
  }

  // ---- binding ----------------------------------------------------------

  function registerValidator(path: string, validator: FieldValidator): void {
    let set_ = fieldValidators.get(path);
    if (!set_) {
      set_ = new Set();
      fieldValidators.set(path, set_);
    }
    set_.add(validator);
    knownFields.add(path);
  }

  function unregisterValidator(path: string, validator: FieldValidator): void {
    const set_ = fieldValidators.get(path);
    if (!set_)
      return;
    set_.delete(validator);
    if (set_.size === 0)
      fieldValidators.delete(path);
  }

  function defineField<P extends FieldPath<TInput>>(
    path: P,
    fieldOptions?: { validate?: FieldValidator<FieldPathValue<TInput, P>, TInput>; validateOn?: ValidationTrigger },
  ): [Ref<FieldPathValue<TInput, P>>, ComputedRef<FieldBindingProps>] {
    knownFields.add(path as string);

    if (fieldOptions?.validate)
      registerValidator(path as string, fieldOptions.validate as FieldValidator);

    const model = computed<FieldPathValue<TInput, P>>({
      get: () => getFieldValue(path),
      set: value => setFieldValue(path, value, { shouldValidate: shouldValidate('value', fieldOptions?.validateOn) }),
    });

    const props = computed<FieldBindingProps>(() => ({
      name: path as string,
      onBlur: () => {
        touchedMap[path as string] = true;
        if (shouldValidate('blur', fieldOptions?.validateOn))
          void validate();
      },
      'aria-invalid': getErrors(path).length > 0 ? true : undefined,
    }));

    return [model as Ref<FieldPathValue<TInput, P>>, props];
  }

  const formProps = {
    onSubmit: (event: Event): void => {
      event.preventDefault();
    },
    onReset: handleReset,
    novalidate: true,
  };

  const context: UseFormReturn<TInput, TOutput> = {
    values,
    errors,
    meta,
    isDirty,
    isValid,
    isValidating: readonly(isValidating),
    isSubmitting: readonly(isSubmitting),
    submitCount: readonly(submitCount),
    getFieldValue,
    getError,
    getErrors,
    isFieldDirty,
    isFieldTouched,
    isFieldValid,
    setFieldValue,
    setValues,
    setFieldError,
    setErrors,
    setFieldTouched,
    setTouched,
    validate,
    validateField,
    resetForm,
    resetField,
    handleSubmit,
    handleReset,
    defineField,
    formProps,
    _registerValidator: registerValidator,
    _unregisterValidator: unregisterValidator,
    _shouldValidate: trigger => (trigger === 'submit' ? true : shouldValidate(trigger)),
    _remapFieldPaths: remapFieldPaths,
  };

  provideFormContext(context as UseFormReturn);

  tryOnMounted(() => {
    if (validateOnMount)
      void validate();
  });

  return context;
}
