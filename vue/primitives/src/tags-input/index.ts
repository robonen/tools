export { default as TagsInputRoot } from './TagsInputRoot.vue';
export { default as TagsInputItem } from './TagsInputItem.vue';
export { default as TagsInputItemText } from './TagsInputItemText.vue';
export { default as TagsInputItemDelete } from './TagsInputItemDelete.vue';
export { default as TagsInputInput } from './TagsInputInput.vue';
export { default as TagsInputClear } from './TagsInputClear.vue';

export {
  provideTagsInputContext,
  useTagsInputContext,
  provideTagsInputItemContext,
  useTagsInputItemContext,
  type TagsInputContext,
  type TagsInputItemContext,
  type TagValue,
} from './context';

export type { TagsInputRootProps, TagsInputRootEmits } from './TagsInputRoot.vue';
export type { TagsInputItemProps } from './TagsInputItem.vue';
export type { TagsInputItemTextProps } from './TagsInputItemText.vue';
export type { TagsInputItemDeleteProps } from './TagsInputItemDelete.vue';
export type { TagsInputInputProps } from './TagsInputInput.vue';
export type { TagsInputClearProps } from './TagsInputClear.vue';
