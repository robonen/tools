import { computed, ref, toValue, watch } from 'vue';
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue';
import { insert as insertAt, move as moveItem, remove as removeAt, swap as swapItems } from '@robonen/stdlib';
import { injectFormContext } from '../useForm/context';
import type {
  FieldArrayEntry,
  UseFieldArrayOptions,
  UseFieldArrayReturn,
} from '../useForm';

/**
 * @name useFieldArray
 * @category Forms
 * @description Manage a dynamic array field within a {@link useForm}. Exposes a
 * reactive `fields` list with **stable keys** (preserved across reorders, so
 * `v-for :key` keeps DOM/state intact) plus immutable `push`/`prepend`/`insert`/
 * `remove`/`move`/`swap`/`replace`/`update` operations that also re-key the
 * matching errors and touched state.
 *
 * @param {MaybeRefOrGetter<string>} path The dotted path of the array field
 * @param {UseFieldArrayOptions} [options={}] Optionally an explicit `form`
 * @returns {UseFieldArrayReturn} The reactive entries and mutation helpers
 *
 * @example
 * const form = useForm({ initialValues: { users: [{ name: '' }] } });
 * const { fields, push, remove } = useFieldArray('users');
 * // <div v-for="(field, i) in fields" :key="field.key">
 * //   <input v-model="field.value.name"> <button @click="remove(i)">x</button>
 * // </div>
 * // <button @click="push({ name: '' })">add</button>
 *
 * @since 0.0.16
 */
export function useFieldArray<T = any>(
  path: MaybeRefOrGetter<string>,
  options: UseFieldArrayOptions = {},
): UseFieldArrayReturn<T> {
  const form = options.form ?? injectFormContext();

  if (!form)
    throw new Error('[useFieldArray] must be used within a useForm() provider or given an explicit `form`.');

  const resolvePath = (): string => toValue(path);

  function currentArray(): T[] {
    return (form!.getFieldValue(resolvePath() as never) as T[] | undefined) ?? [];
  }

  // Stable keys parallel to the values array — one per item, preserved on reorder.
  let keyCounter = 0;
  const keys = ref<number[]>(currentArray().map(() => keyCounter++));

  // Reconcile keys if the array length changes from outside our own ops.
  watch(() => currentArray().length, (length) => {
    const current = keys.value;
    if (length > current.length) {
      const next = current.slice();
      while (next.length < length)
        next.push(keyCounter++);
      keys.value = next;
    }
    else if (length < current.length) {
      keys.value = current.slice(0, length);
    }
  });

  function indexRef(index: number): Ref<T> {
    return computed<T>({
      get: () => (form!.getFieldValue(`${resolvePath()}.${index}` as never) as T),
      set: value => form!.setFieldValue(`${resolvePath()}.${index}` as never, value as never, { shouldValidate: false }),
    }) as unknown as Ref<T>;
  }

  const fields = computed<Array<FieldArrayEntry<T>>>(() => {
    const length = currentArray().length;
    const keyList = keys.value;

    return Array.from({ length }, (_unused, index) => ({
      key: keyList[index] ?? index,
      value: indexRef(index),
      isFirst: index === 0,
      isLast: index === length - 1,
    }));
  });

  function writeArray(nextValues: T[], nextKeys: number[]): void {
    form!.setFieldValue(resolvePath() as never, nextValues as never, { shouldValidate: false });
    keys.value = nextKeys;
  }

  function push(value: T): void {
    writeArray([...currentArray(), value], [...keys.value, keyCounter++]);
  }

  function prepend(value: T): void {
    writeArray([value, ...currentArray()], [keyCounter++, ...keys.value]);
    form!._remapFieldPaths(resolvePath(), index => index + 1);
  }

  function insert(index: number, value: T): void {
    writeArray(insertAt(currentArray(), index, value), insertAt(keys.value, index, keyCounter++));
    form!._remapFieldPaths(resolvePath(), current => (current >= index ? current + 1 : current));
  }

  function remove(index: number): void {
    writeArray(removeAt(currentArray(), index), removeAt(keys.value, index));
    form!._remapFieldPaths(resolvePath(), current =>
      current === index ? null : current > index ? current - 1 : current);
  }

  function move(from: number, to: number): void {
    writeArray(moveItem(currentArray(), from, to), moveItem(keys.value, from, to));
    const order = moveItem(Array.from({ length: currentArray().length }, (_unused, index) => index), from, to);
    form!._remapFieldPaths(resolvePath(), current => order.indexOf(current));
  }

  function swap(indexA: number, indexB: number): void {
    writeArray(swapItems(currentArray(), indexA, indexB), swapItems(keys.value, indexA, indexB));
    form!._remapFieldPaths(resolvePath(), current =>
      current === indexA ? indexB : current === indexB ? indexA : current);
  }

  function replace(values: T[]): void {
    writeArray([...values], values.map(() => keyCounter++));
  }

  function update(index: number, value: T): void {
    const next = currentArray().slice();
    if (index < 0 || index >= next.length)
      return;
    next[index] = value;
    writeArray(next, keys.value.slice());
  }

  return {
    fields: fields as ComputedRef<Array<FieldArrayEntry<T>>>,
    push,
    prepend,
    insert,
    remove,
    move,
    swap,
    replace,
    update,
  };
}
