import { computed, ref, toValue, watch } from 'vue';
import type { MaybeRefOrGetter, Ref } from 'vue';
import { cloneFnDefault } from '@/composables/reactivity/useCloned';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';
import { isEqual } from '@robonen/stdlib';
import { injectFormContext } from '../useForm/context';
import { normalizeFieldResult, runStandardSchema } from '../useForm/validation';
import type {
  FieldBindingProps,
  FieldMeta,
  FieldValidationResultDetail,
  FieldValidator,
  UseFieldOptions,
  UseFieldReturn,
  ValidationTrigger,
} from '../useForm';

/**
 * @name useField
 * @category Forms
 * @description Bind a single field by path. When rendered under a {@link useForm}
 * (or given an explicit `form`), it reads/writes that form's state; otherwise it
 * runs standalone with its own value, errors, and validation. Returns a writable
 * `value`, reactive errors/meta, blur/change handlers, and `attrs` to spread.
 *
 * @param {MaybeRefOrGetter<string>} path The dotted field path (reactive allowed)
 * @param {UseFieldOptions} [options={}] Validators, schema, trigger, explicit form, or standalone `initialValue`
 * @returns {UseFieldReturn} The field's reactive value, errors, meta, and handlers
 *
 * @example
 * // Within a useForm() component
 * const { value, errorMessage, attrs } = useField('email', {
 *   validate: (v) => v.includes('@') || 'Invalid email',
 * });
 * // <input v-model="value" v-bind="attrs">
 *
 * @example
 * // Standalone (no form ancestor)
 * const { value, errors } = useField('search', { initialValue: '', schema });
 *
 * @since 0.0.16
 */
export function useField<T = any>(
  path: MaybeRefOrGetter<string>,
  options: UseFieldOptions<T> = {},
): UseFieldReturn<T> {
  const form = options.form ?? injectFormContext();
  const resolvePath = (): string => toValue(path);

  // Wrap a per-field Standard Schema as a function validator (reuse the adapter).
  const schemaValidator: ((value: T) => Promise<string[]>) | undefined = options.schema
    ? async (value): Promise<string[]> => {
      const run = await runStandardSchema(options.schema!, value);
      return run.valid ? [] : Object.values(run.errors).flat();
    }
    : undefined;

  // Decide whether a given event should trigger validation, honoring a
  // field-level `validateOn` override or deferring to the form's gate.
  function fieldShould(event: 'value' | 'blur'): boolean {
    const override: ValidationTrigger | undefined = options.validateOn;
    if (override) {
      if (override === 'manual' || override === 'submit')
        return false;
      return override === 'value' || event === 'blur';
    }

    return form ? form._shouldValidate(event) : true;
  }

  if (form) {
    // ---- bound mode -----------------------------------------------------
    if (options.validate)
      form._registerValidator(resolvePath(), options.validate as FieldValidator);
    if (schemaValidator)
      form._registerValidator(resolvePath(), schemaValidator as FieldValidator);

    // Re-register field validators when a reactive path changes.
    watch(resolvePath, (next, prev) => {
      if (next === prev)
        return;
      if (options.validate) {
        form._unregisterValidator(prev, options.validate as FieldValidator);
        form._registerValidator(next, options.validate as FieldValidator);
      }
      if (schemaValidator) {
        form._unregisterValidator(prev, schemaValidator as FieldValidator);
        form._registerValidator(next, schemaValidator as FieldValidator);
      }
    });

    tryOnScopeDispose(() => {
      if (options.validate)
        form._unregisterValidator(resolvePath(), options.validate as FieldValidator);
      if (schemaValidator)
        form._unregisterValidator(resolvePath(), schemaValidator as FieldValidator);
    });

    const value = computed<T>({
      get: () => form.getFieldValue(resolvePath() as never) as T,
      set: (next) => {
        form.setFieldValue(resolvePath() as never, next as never, { shouldValidate: false });
        if (fieldShould('value'))
          void form.validateField(resolvePath() as never);
      },
    });

    const errors = computed<string[]>(() => form.getErrors(resolvePath() as never));
    const errorMessage = computed<string | undefined>(() => errors.value[0]);

    const meta: FieldMeta = {
      dirty: computed(() => form.isFieldDirty(resolvePath() as never)),
      touched: computed(() => form.isFieldTouched(resolvePath() as never)),
      valid: computed(() => errors.value.length === 0),
    };

    const setValue = (next: T): void => {
      value.value = next;
    };

    const handleChange = (next: T, shouldValidate = fieldShould('value')): void => {
      form.setFieldValue(resolvePath() as never, next as never, { shouldValidate });
    };

    const handleBlur = (): void => {
      form.setFieldTouched(resolvePath() as never, true);
      if (fieldShould('blur'))
        void form.validateField(resolvePath() as never);
    };

    const handleInput = (event: Event): void => {
      const target = event.target as HTMLInputElement;
      const next = (target.type === 'checkbox' ? target.checked : target.value) as unknown as T;
      handleChange(next);
    };

    const attrs = computed<FieldBindingProps>(() => ({
      name: resolvePath(),
      onBlur: handleBlur,
      'aria-invalid': errors.value.length > 0 ? true : undefined,
    }));

    return {
      value,
      errors,
      errorMessage,
      meta,
      handleBlur,
      handleChange,
      handleInput,
      setValue,
      setTouched: (touched = true) => form.setFieldTouched(resolvePath() as never, touched),
      setErrors: message => form.setFieldError(resolvePath() as never, message),
      validate: () => form.validateField(resolvePath() as never),
      reset: () => form.resetField(resolvePath() as never),
      attrs,
    };
  }

  // ---- standalone mode --------------------------------------------------
  const localValue = ref(options.initialValue) as Ref<T>;
  const localErrors = ref<string[]>([]);
  const localTouched = ref(false);
  const initialSnapshot = cloneFnDefault(options.initialValue) as T;

  async function runLocal(): Promise<FieldValidationResultDetail> {
    const messages: string[] = [];

    if (schemaValidator)
      messages.push(...await schemaValidator(localValue.value));
    if (options.validate)
      messages.push(...normalizeFieldResult(await options.validate(localValue.value, {} as never)));

    localErrors.value = messages;
    return { valid: messages.length === 0, errors: messages };
  }

  const errors = computed<string[]>(() => localErrors.value);
  const errorMessage = computed<string | undefined>(() => errors.value[0]);

  const meta: FieldMeta = {
    dirty: computed(() => !isEqual(localValue.value, initialSnapshot)),
    touched: computed(() => localTouched.value),
    valid: computed(() => errors.value.length === 0),
  };

  const handleChange = (next: T, shouldValidate = fieldShould('value')): void => {
    localValue.value = next;
    if (shouldValidate)
      void runLocal();
  };

  const handleBlur = (): void => {
    localTouched.value = true;
    if (fieldShould('blur'))
      void runLocal();
  };

  const handleInput = (event: Event): void => {
    const target = event.target as HTMLInputElement;
    const next = (target.type === 'checkbox' ? target.checked : target.value) as unknown as T;
    handleChange(next);
  };

  const attrs = computed<FieldBindingProps>(() => ({
    name: resolvePath(),
    onBlur: handleBlur,
    'aria-invalid': errors.value.length > 0 ? true : undefined,
  }));

  return {
    value: localValue,
    errors,
    errorMessage,
    meta,
    handleBlur,
    handleChange,
    handleInput,
    setValue: (next) => {
      localValue.value = next;
    },
    setTouched: (touched = true) => {
      localTouched.value = touched;
    },
    setErrors: (message) => {
      localErrors.value = message === null ? [] : Array.isArray(message) ? message : [message];
    },
    validate: runLocal,
    reset: () => {
      localValue.value = cloneFnDefault(initialSnapshot);
      localErrors.value = [];
      localTouched.value = false;
    },
    attrs,
  };
}
