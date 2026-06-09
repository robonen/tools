<script lang="ts" generic="T extends TagValue = string">
import type { PrimitiveProps } from '../primitive';
import type { TagValue } from './context';

/**
 * A headless tags / token input: type a value, commit it on Enter (or paste,
 * Tab, blur, or a custom delimiter), and manage the resulting list of tags with
 * full keyboard navigation, duplicate/max guards, and accessible labelling.
 * Use it for free-form multi-value entry such as email recipients, keywords,
 * skills, or filter chips. Wraps the `Item`, `ItemText`, `ItemDelete`, `Input`,
 * and `Clear` parts and provides their shared context.
 */
export interface TagsInputRootProps<U extends TagValue = string> extends PrimitiveProps {
  /** Uncontrolled initial value. @default [] */
  defaultValue?: U[];
  /** Add on paste (respects `delimiter`). */
  addOnPaste?: boolean;
  /** Add on Tab. */
  addOnTab?: boolean;
  /** Add on blur. */
  addOnBlur?: boolean;
  /** Allow duplicate tags. */
  duplicate?: boolean;
  /** Disable the whole component. */
  disabled?: boolean;
  /** Character or regex that splits/commits input. @default ',' */
  delimiter?: string | RegExp;
  /** Writing direction. Falls back to `ConfigProvider` when omitted. */
  dir?: 'ltr' | 'rtl';
  /** Maximum number of tags. `0` disables the cap. @default 0 */
  max?: number;
  /** Map a raw input string to a tag. Required for non-string tag values. */
  convertValue?: (raw: string) => U;
  /** Render a tag value as text. @default `String(v)` */
  displayValue?: (value: U) => string;
}

export interface TagsInputRootEmits<U extends TagValue = string> {
  addTag: [value: U];
  removeTag: [value: U];
  invalid: [value: U];
}
</script>

<script setup lang="ts" generic="T extends TagValue = string">
import { computed, ref, shallowRef, toRef, watch } from 'vue';
import { Primitive } from '../primitive';
import type { Ref } from 'vue';
import { provideTagsInputContext } from './context';
import { useCollectionProvider } from '../collection';
import { useConfig } from '../config-provider';
import { useForwardExpose } from '@robonen/vue';

const {
  as = 'div',
  defaultValue,
  addOnPaste = false,
  addOnTab = false,
  addOnBlur = false,
  duplicate = false,
  disabled = false,
  delimiter = ',',
  dir,
  max = 0,
  convertValue,
  displayValue,
} = defineProps<TagsInputRootProps<T>>();

const emit = defineEmits<TagsInputRootEmits<T>>();

const model = defineModel<T[]>();

const { forwardRef } = useForwardExpose();
const config = useConfig();
const direction = computed(() => dir ?? config.dir.value);

// shallowRef: array is always replaced via commit(), never mutated in place.
const localValue = shallowRef<T[]>((model.value ?? defaultValue ?? []).slice()) as Ref<T[]>;

watch(model, (v) => {
  if (v === undefined) return;
  const cur = localValue.value;
  if (v.length === cur.length) {
    let equal = true;
    for (let i = 0; i < v.length; i++) {
      if (v[i] !== cur[i]) {
        equal = false;
        break;
      }
    }
    if (equal) return;
  }
  localValue.value = v.slice();
});

const selectedElement = shallowRef<HTMLElement>();
const isInvalidInput = ref(false);

const { getItems, CollectionSlot } = useCollectionProvider();

function commit(next: T[]): void {
  localValue.value = next;
  model.value = next;
}

const convert: (raw: string) => T = convertValue ?? ((raw: string) => raw as unknown as T);
const display: (value: T) => string = displayValue ?? ((value: T) => String(value));

function onAddValue(raw: string): boolean {
  if (disabled) return false;
  const cur = localValue.value;
  if (max > 0 && cur.length >= max) {
    const payload = convert(raw);
    isInvalidInput.value = true;
    emit('invalid', payload);
    return false;
  }
  const payload = convert(raw);
  if (!duplicate) {
    const exists = cur.some(v => v === payload || display(v) === display(payload));
    if (exists) {
      isInvalidInput.value = true;
      emit('invalid', payload);
      return false;
    }
  }
  commit([...cur, payload]);
  emit('addTag', payload);
  return true;
}

function onRemoveValue(index: number): void {
  if (disabled || index < 0) return;
  const cur = localValue.value;
  if (index >= cur.length) return;
  const removed = cur[index]!;
  const next = cur.slice();
  next.splice(index, 1);
  commit(next);
  emit('removeTag', removed);
}

function collectTagEls(): HTMLElement[] {
  return getItems(false).map(i => i.ref);
}

function onInputKeyDown(event: KeyboardEvent): void {
  const target = event.target as HTMLInputElement;
  const tags = collectTagEls();
  if (tags.length === 0) return;
  const lastTag = tags[tags.length - 1]!;
  const atCaretStart = target.selectionStart === 0 && target.selectionEnd === 0;

  switch (event.key) {
    case 'Delete':
    case 'Backspace': {
      if (!atCaretStart) return;
      if (selectedElement.value) {
        const idx = tags.indexOf(selectedElement.value);
        if (idx === -1) return;
        onRemoveValue(idx);
        // After removal, focus the neighbouring tag or clear.
        const after = collectTagEls();
        const nextEl = event.key === 'Backspace'
          ? (after[idx - 1] ?? after[after.length - 1])
          : (after[idx] ?? after[after.length - 1]);
        selectedElement.value = nextEl;
        event.preventDefault();
      }
      else if (event.key === 'Backspace') {
        selectedElement.value = lastTag;
        event.preventDefault();
      }
      return;
    }
    case 'ArrowLeft':
    case 'ArrowRight': {
      if (!atCaretStart) return;
      const ltr = direction.value !== 'rtl';
      const isBack = (event.key === 'ArrowLeft' && ltr) || (event.key === 'ArrowRight' && !ltr);
      const isForward = !isBack;
      if (isBack && !selectedElement.value) {
        selectedElement.value = lastTag;
        event.preventDefault();
        return;
      }
      if (isForward && selectedElement.value === lastTag) {
        selectedElement.value = undefined;
        target.focus();
        event.preventDefault();
        return;
      }
      if (selectedElement.value) {
        const idx = tags.indexOf(selectedElement.value);
        if (idx === -1) return;
        const delta = isBack ? -1 : 1;
        const nextIdx = Math.max(0, Math.min(tags.length - 1, idx + delta));
        selectedElement.value = tags[nextIdx]!;
        event.preventDefault();
      }
      return;
    }
    case 'Home':
    case 'End': {
      if (!atCaretStart) return;
      if (selectedElement.value) {
        selectedElement.value = event.key === 'Home' ? tags[0]! : lastTag;
        event.preventDefault();
      }
      return;
    }
    case 'ArrowUp':
    case 'ArrowDown': {
      if (selectedElement.value) event.preventDefault();
      return;
    }
    default: {
      selectedElement.value = undefined;
    }
  }
}

provideTagsInputContext({
  modelValue: localValue,
  selectedElement,
  isInvalidInput,
  addOnPaste: toRef(() => addOnPaste),
  addOnTab: toRef(() => addOnTab),
  addOnBlur: toRef(() => addOnBlur),
  disabled: toRef(() => disabled),
  delimiter: toRef(() => delimiter),
  direction,
  max: toRef(() => max),
  duplicate: toRef(() => duplicate),
  convertValue: convert,
  displayValue: display,
  onAddValue,
  onRemoveValue,
  onInputKeyDown,
});
</script>

<template>
  <CollectionSlot>
    <Primitive
      :ref="forwardRef"
      :as="as"
      :dir="direction"
      :data-disabled="disabled ? '' : undefined"
      :data-invalid="isInvalidInput ? '' : undefined"
    >
      <slot :model-value="localValue" />
    </Primitive>
  </CollectionSlot>
</template>
