<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface TagsInputItemTextProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { useForwardExpose } from '@robonen/vue';
import { useId } from '../config-provider';
import { useTagsInputItemContext } from './context';

const { as = 'span' } = defineProps<TagsInputItemTextProps>();

const item = useTagsInputItemContext();
const { forwardRef } = useForwardExpose();

// Lazily assign an id the first time the text part is mounted — kept on the
// shared context so the sibling `<TagsInputItem>` / `<TagsInputItemDelete>` can
// point `aria-labelledby` at it without us generating an id per tag eagerly.
if (!item.textId.value) item.textId.value = useId(undefined, 'tags-input-item-text').value;
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :id="item.textId.value"
  >
    <slot>{{ item.displayValue.value }}</slot>
  </Primitive>
</template>
