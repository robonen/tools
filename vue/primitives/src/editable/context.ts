import type { Ref, ShallowRef } from 'vue';
import { useContextFactory } from '@robonen/vue';

export type EditableActivationMode = 'focus' | 'dblclick' | 'none';
export type EditableSubmitMode = 'blur' | 'enter' | 'none' | 'both';

export interface EditablePlaceholder {
  edit: string;
  preview: string;
}

export interface EditableContext {
  /** Current committed value (mirrors v-model). */
  modelValue: Ref<string>;
  /** Draft value bound to the input while editing. */
  inputValue: Ref<string>;
  /** Whether the component is in edit mode. */
  isEditing: Ref<boolean>;
  /** Resolved placeholder per mode. */
  placeholder: Ref<EditablePlaceholder>;
  /** Whether `modelValue` is empty. */
  isEmpty: Ref<boolean>;

  disabled: Ref<boolean>;
  readonly: Ref<boolean>;
  maxLength: Ref<number | undefined>;
  activationMode: Ref<EditableActivationMode>;
  submitMode: Ref<EditableSubmitMode>;
  selectOnFocus: Ref<boolean>;
  autoResize: Ref<boolean>;
  startWithEditMode: Ref<boolean>;

  /** Reactive ref to the `<EditableInput>` element, used for focus/select. */
  inputRef: ShallowRef<HTMLInputElement | undefined>;

  edit: () => void;
  cancel: () => void;
  submit: () => void;
}

export const {
  inject: useEditableContext,
  provide: provideEditableContext,
} = useContextFactory<EditableContext>('editable');
