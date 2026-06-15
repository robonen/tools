<script lang="ts">
import type { EditableActivationMode, EditablePlaceholder, EditableSubmitMode } from './context';
import type { Direction } from '../../utilities/config-provider';
import type { PrimitiveProps } from '../../internal/primitive';

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
  /**
   * Reading direction. When omitted, inherits from the active `ConfigProvider`
   * and otherwise assumes left-to-right.
   */
  dir?: Direction;
  /** Stable id, applied to the input and forwarded through context. */
  id?: string;
  /**
   * Native control name. When set and the Root is inside a `<form>`, a
   * visually-hidden `<input>` submits the value with the surrounding form.
   */
  name?: string;
  /** Mark the field required so native form validation fires on empty submit. */
  required?: boolean;
}

export interface EditableRootEmits {
  'update:state': [state: 'edit' | 'submit' | 'cancel'];
  submit: [value: string];
}
</script>

<script setup lang="ts">
import { computed, ref, shallowRef, toRef, watch } from 'vue';
import { Primitive } from '../../internal/primitive';
import { provideEditableContext } from './context';
import { useEventListener, useForwardExpose, useTimeoutFn } from '@robonen/vue';
import { useDirection, useId } from '../../utilities/config-provider';
import { VisuallyHiddenInput } from '../../utilities/visually-hidden';

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
  dir: dirProp,
  id,
  name,
  required = false,
} = defineProps<EditableRootProps>();

const emit = defineEmits<EditableRootEmits>();

const dir = useDirection(() => dirProp);
const resolvedId = useId(() => id, 'editable');

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

// `defineExpose` runs before `useForwardExpose` so the imperative methods are
// merged onto the instance's exposed object alongside the forwarded element.
defineExpose({ edit, cancel, submit });
const { forwardRef, currentElement } = useForwardExpose();

const isFormControl = computed(() => {
  const el = currentElement.value;
  return !!el && !!el.closest('form');
});

// Commit or discard on an outside interaction, honoring `submitMode`.
function handleDismiss(): void {
  if (!isEditing.value) return;
  if (submitMode === 'blur' || submitMode === 'both') submit();
  else cancel();
}

// Deferred dismiss check. Hiding the focused preview/trigger on entering edit
// mode fires a synchronous focusout with relatedTarget=null before the input's
// autofocus lands — defer the decision and re-check where focus actually ended
// up. Also covers the `relatedTarget === null` browser case where blur reports
// no next target even though focus stayed within the root. Auto-cancelled on
// scope dispose.
const { start: deferDismissCheck, stop: cancelDismissCheck } = useTimeoutFn(() => {
  if (!isEditing.value) return;
  const root = currentElement.value;
  const active = document.activeElement;
  if (root && active && root.contains(active)) return;
  handleDismiss();
}, 0, { immediate: false });

function onFocusOutCapture(event: FocusEvent): void {
  if (!isEditing.value) return;
  const root = currentElement.value;
  const next = event.relatedTarget as Node | null;
  if (root && next && root.contains(next)) return;
  cancelDismissCheck();
  deferDismissCheck();
}

// Pointer-down outside the root also dismisses, covering clicks on
// non-focusable regions that never move DOM focus (and thus never fire a
// dismissing `focusout`). Document-level + capture so it sees the interaction
// before it is swallowed; auto-disposed with the component scope.
useEventListener(
  () => (typeof document === 'undefined' ? undefined : document),
  'pointerdown',
  (event: Event) => {
    if (!isEditing.value) return;
    const root = currentElement.value;
    const target = event.target as Node | null;
    if (root && target && (root === target || root.contains(target))) return;
    handleDismiss();
  },
  { capture: true },
);

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
  id: resolvedId,
  dir,
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
    :dir="dir"
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

    <VisuallyHiddenInput
      v-if="isFormControl && name"
      type="text"
      :name="name"
      :value="model"
      :required="required"
      :disabled="disabled"
    />
  </Primitive>
</template>
