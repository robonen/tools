<script lang="ts">
import type { EditableActivationMode, EditablePlaceholder, EditableSubmitMode } from './context';
import type { PrimitiveProps } from '../primitive';

export interface EditableRootProps extends PrimitiveProps {
  /** Controlled value. Use `v-model`. */
  modelValue?: string;
  /** Uncontrolled initial value. @default '' */
  defaultValue?: string;
  /** Placeholder for edit / preview. A single string applies to both. */
  placeholder?: string | EditablePlaceholder;
  /** When the preview should switch to edit mode. @default 'focus' */
  activationMode?: EditableActivationMode;
  /** How edits are committed. @default 'blur' */
  submitMode?: EditableSubmitMode;
  /** Mount in edit mode. */
  startWithEditMode?: boolean;
  /** Select the input content on focus. */
  selectOnFocus?: boolean;
  /** Grid-based auto resize mode — preview and input share a grid cell. */
  autoResize?: boolean;
  /** Max input length. */
  maxLength?: number;
  /** Disabled state. */
  disabled?: boolean;
  /** Read-only state. */
  readonly?: boolean;
}

export interface EditableRootEmits {
  'update:modelValue': [value: string];
  'update:state': [state: 'edit' | 'submit' | 'cancel'];
  submit: [value: string];
}
</script>

<script setup lang="ts">
import { computed, ref, shallowRef, toRef, watch } from 'vue';
import { Primitive } from '../primitive';
import { provideEditableContext } from './context';
import { useForwardExpose } from '@robonen/vue';

defineOptions({ inheritAttrs: false });

const {
  as = 'div',
  modelValue,
  defaultValue = '',
  placeholder = 'Enter text…',
  activationMode = 'focus',
  submitMode = 'blur',
  startWithEditMode = false,
  selectOnFocus = false,
  autoResize = false,
  maxLength,
  disabled = false,
  readonly = false,
} = defineProps<EditableRootProps>();

const emit = defineEmits<EditableRootEmits>();

const { forwardRef, currentElement } = useForwardExpose();

const localValue = ref<string>(modelValue ?? defaultValue);

watch(() => modelValue, (v) => {
  if (v === undefined || v === localValue.value) return;
  localValue.value = v;
});

const inputValue = ref<string>(localValue.value);
const isEditing = ref<boolean>(startWithEditMode);
const inputRef = shallowRef<HTMLInputElement | undefined>();

// Keep the draft in sync when modelValue changes from outside.
watch(localValue, (v) => {
  inputValue.value = v;
});

const resolvedPlaceholder = computed<EditablePlaceholder>(() =>
  typeof placeholder === 'string'
    ? { edit: placeholder, preview: placeholder }
    : placeholder,
);

const isEmpty = computed(() => localValue.value === '');

function commitModel(v: string): void {
  if (v === localValue.value) return;
  localValue.value = v;
  emit('update:modelValue', v);
}

function edit(): void {
  if (disabled || readonly) return;
  inputValue.value = localValue.value;
  isEditing.value = true;
  emit('update:state', 'edit');
}

function cancel(): void {
  isEditing.value = false;
  inputValue.value = localValue.value;
  emit('update:state', 'cancel');
}

function submit(): void {
  commitModel(inputValue.value);
  isEditing.value = false;
  emit('update:state', 'submit');
  emit('submit', inputValue.value);
}

function onFocusOutCapture(event: FocusEvent): void {
  if (!isEditing.value) return;
  const root = currentElement.value;
  const next = event.relatedTarget as Node | null;
  if (root && next && root.contains(next)) return;
  if (submitMode === 'blur' || submitMode === 'both') submit();
  else cancel();
}

provideEditableContext({
  modelValue: localValue,
  inputValue,
  isEditing,
  placeholder: resolvedPlaceholder,
  isEmpty,
  disabled: toRef(() => disabled),
  readonly: toRef(() => readonly),
  maxLength: toRef(() => maxLength),
  activationMode: toRef(() => activationMode),
  submitMode: toRef(() => submitMode),
  selectOnFocus: toRef(() => selectOnFocus),
  autoResize: toRef(() => autoResize),
  startWithEditMode: toRef(() => startWithEditMode),
  inputRef,
  edit,
  cancel,
  submit,
});
</script>

<template>
  <Primitive
    v-bind="$attrs"
    :ref="forwardRef"
    :as="as"
    :data-state="isEditing ? 'edit' : 'preview'"
    :data-empty="isEmpty ? '' : undefined"
    :data-disabled="disabled ? '' : undefined"
    :data-readonly="readonly ? '' : undefined"
    @focusout.capture="onFocusOutCapture"
  >
    <slot
      :model-value="localValue"
      :is-editing="isEditing"
      :is-empty="isEmpty"
      :edit="edit"
      :cancel="cancel"
      :submit="submit"
    />
  </Primitive>
</template>
