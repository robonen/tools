<script lang="ts">
import type { EditableActivationMode, EditablePlaceholder, EditableSubmitMode } from './context';
import type { PrimitiveProps } from '../primitive';

/**
 * Inline-editable text field that toggles between a read-only preview and an
 * editable input. Root owns the value (via `v-model`), edit state, and submit /
 * cancel behavior, providing them to its parts. Use it for click-to-edit labels,
 * titles, and table cells where a full form input would be heavy.
 */
export interface EditableRootProps extends PrimitiveProps {
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
  'update:state': [state: 'edit' | 'submit' | 'cancel'];
  submit: [value: string];
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, toRef, watch } from 'vue';
import { Primitive } from '../primitive';
import { provideEditableContext } from './context';
import { useForwardExpose } from '@robonen/vue';

defineOptions({ inheritAttrs: false });

const {
  as = 'div',
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

// Uncontrolled fallback, seeded from `defaultValue`. In controlled mode the
// `get` reads the live prop, so local state can never go stale.
const localValue = ref<string>(defaultValue);

const model = defineModel<string>({
  get: v => v ?? localValue.value,
  set: (v) => {
    localValue.value = v;
    return v;
  },
});

const inputValue = ref<string>(model.value);
const isEditing = ref<boolean>(startWithEditMode);
const inputRef = shallowRef<HTMLInputElement | undefined>();

// Keep the draft in sync when the committed value changes from outside.
watch(model, (v) => {
  inputValue.value = v;
});

const resolvedPlaceholder = computed<EditablePlaceholder>(() =>
  typeof placeholder === 'string'
    ? { edit: placeholder, preview: placeholder }
    : placeholder,
);

const isEmpty = computed(() => model.value === '');

function commitModel(v: string): void {
  if (v === model.value) return;
  model.value = v;
}

function edit(): void {
  if (disabled || readonly) return;
  inputValue.value = model.value;
  isEditing.value = true;
  emit('update:state', 'edit');
}

function cancel(): void {
  if (!isEditing.value) return;
  isEditing.value = false;
  inputValue.value = model.value;
  emit('update:state', 'cancel');
}

function submit(): void {
  if (!isEditing.value) return;
  commitModel(inputValue.value);
  isEditing.value = false;
  emit('update:state', 'submit');
  emit('submit', inputValue.value);
}

let blurTimer: ReturnType<typeof setTimeout> | undefined;
onBeforeUnmount(() => clearTimeout(blurTimer));

function onFocusOutCapture(event: FocusEvent): void {
  if (!isEditing.value) return;
  const root = currentElement.value;
  const next = event.relatedTarget as Node | null;
  if (root && next && root.contains(next)) return;
  // Hiding the focused preview/trigger on entering edit mode fires a
  // synchronous focusout with relatedTarget=null before the input's autofocus
  // lands — defer the decision and re-check where focus actually ended up.
  clearTimeout(blurTimer);
  blurTimer = setTimeout(() => {
    if (!isEditing.value) return;
    const active = document.activeElement;
    if (root && active && root.contains(active)) return;
    if (submitMode === 'blur' || submitMode === 'both') submit();
    else cancel();
  }, 0);
}

provideEditableContext({
  modelValue: model,
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
      :model-value="model"
      :is-editing="isEditing"
      :is-empty="isEmpty"
      :edit="edit"
      :cancel="cancel"
      :submit="submit"
    />
  </Primitive>
</template>
