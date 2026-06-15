export { default as EditableRoot } from './EditableRoot.vue';
export { default as EditableArea } from './EditableArea.vue';
export { default as EditablePreview } from './EditablePreview.vue';
export { default as EditableInput } from './EditableInput.vue';
export { default as EditableEditTrigger } from './EditableEditTrigger.vue';
export { default as EditableSubmitTrigger } from './EditableSubmitTrigger.vue';
export { default as EditableCancelTrigger } from './EditableCancelTrigger.vue';

export {
  provideEditableContext,
  useEditableContext,
  type EditableContext,
  type EditableActivationMode,
  type EditableSubmitMode,
  type EditablePlaceholder,
} from './context';

export type { EditableRootProps, EditableRootEmits } from './EditableRoot.vue';
export type { EditableAreaProps } from './EditableArea.vue';
export type { EditablePreviewProps } from './EditablePreview.vue';
export type { EditableInputProps } from './EditableInput.vue';
export type { EditableEditTriggerProps } from './EditableEditTrigger.vue';
export type { EditableSubmitTriggerProps } from './EditableSubmitTrigger.vue';
export type { EditableCancelTriggerProps } from './EditableCancelTrigger.vue';
