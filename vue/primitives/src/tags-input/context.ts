import type { Ref, ShallowRef } from 'vue';
import { useContextFactory } from '@robonen/vue';

export type TagValue = string | number | Record<string, unknown>;

export interface TagsInputContext<T extends TagValue = TagValue> {
  /** Current list of tags. */
  modelValue: Ref<T[]>;
  /** Currently focused tag element (for keyboard selection in the strip). */
  selectedElement: ShallowRef<HTMLElement | undefined>;
  /** Whether the last input attempt was rejected (duplicate or over max). */
  isInvalidInput: Ref<boolean>;

  addOnPaste: Ref<boolean>;
  addOnTab: Ref<boolean>;
  addOnBlur: Ref<boolean>;
  disabled: Ref<boolean>;
  delimiter: Ref<string | RegExp>;
  direction: Ref<'ltr' | 'rtl'>;
  max: Ref<number>;
  /** Allow duplicate tags. */
  duplicate: Ref<boolean>;

  /** Normalize a raw string into a tag value. */
  convertValue: (raw: string) => T;
  /** Format a tag value for display. */
  displayValue: (value: T) => string;

  /** Append a tag from a raw string. Returns `true` on success. */
  onAddValue: (raw: string) => boolean;
  /** Remove the tag at `index`. */
  onRemoveValue: (index: number) => void;
  /** Keyboard handler wired from `<TagsInputInput>` to the root. */
  onInputKeyDown: (event: KeyboardEvent) => void;
}

export interface TagsInputItemContext<T extends TagValue = TagValue> {
  value: Ref<T>;
  displayValue: Ref<string>;
  isSelected: Ref<boolean>;
  disabled: Ref<boolean>;
  textId: { value: string };
}

export const {
  inject: useTagsInputContext,
  provide: provideTagsInputContext,
} = useContextFactory<TagsInputContext<any>>('tags-input');

export const {
  inject: useTagsInputItemContext,
  provide: provideTagsInputItemContext,
} = useContextFactory<TagsInputItemContext<any>>('tags-input-item');
