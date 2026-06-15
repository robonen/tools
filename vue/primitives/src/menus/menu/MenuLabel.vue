<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A non-interactive heading for a section of the menu. It is skipped by keyboard
 * navigation and typeahead, so use it to title a group of items rather than as a
 * selectable entry.
 */
export interface MenuLabelProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../../internal/primitive';
import { useMenuGroupContext } from './context';

const { as = 'div' } = defineProps<MenuLabelProps>();

// When rendered inside a MenuGroup, adopt the group's id so the group can point
// `aria-labelledby` at this label. Falls back to no id when used standalone.
const groupCtx = useMenuGroupContext({ id: '' });
</script>

<template>
  <Primitive :as="as" :id="groupCtx.id || undefined">
    <slot />
  </Primitive>
</template>
