<script lang="ts" generic="T extends TagValue = string">
import type { PrimitiveProps } from '../primitive';
import type { TagValue } from './context';

export interface TagsInputItemProps<U extends TagValue = string> extends PrimitiveProps {
  /** The value associated with this tag. */
  value: U;
  /** Disable this specific tag. */
  disabled?: boolean;
}
</script>

<script setup lang="ts" generic="T extends TagValue = string">
import { computed, ref, toRef } from 'vue';
import { provideTagsInputItemContext, useTagsInputContext } from './context';
import { Primitive } from '../primitive';
import { useCollectionInjector } from '../collection';
import { useForwardExpose } from '@robonen/vue';

const { as = 'div', value, disabled = false } = defineProps<TagsInputItemProps<T>>();

const ctx = useTagsInputContext();
const { forwardRef, currentElement } = useForwardExpose();
const { CollectionItem } = useCollectionInjector();

const isSelected = computed(() => ctx.selectedElement.value === currentElement.value);
const isDisabled = computed(() => disabled || ctx.disabled.value);
const display = computed(() => ctx.displayValue(value));

const textId = ref<string>('');

provideTagsInputItemContext({
  value: toRef(() => value) as any,
  displayValue: display,
  isSelected,
  disabled: isDisabled,
  textId,
});
</script>

<template>
  <CollectionItem :value="value">
    <Primitive
      :ref="forwardRef"
      :as="as"
      :aria-labelledby="textId.value || undefined"
      :aria-current="isSelected ? 'true' : undefined"
      :data-state="isSelected ? 'active' : 'inactive'"
      :data-disabled="isDisabled ? '' : undefined"
    >
      <slot :value="value" :display-value="display" :is-selected="isSelected" />
    </Primitive>
  </CollectionItem>
</template>
