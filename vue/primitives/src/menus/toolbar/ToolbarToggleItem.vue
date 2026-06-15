<script lang="ts">
import type { ToggleGroupItemProps } from '../../forms/toggle-group';

/**
 * A single toggle button inside a `ToolbarToggleGroup`. It composes a
 * `ToolbarButton` (which joins the toolbar's roving-focus order) with a
 * `ToggleGroupItem` (which owns the pressed state, `aria-pressed` /
 * `aria-checked` and `data-state`), so one control answers to both the
 * toolbar's keyboard navigation and the toggle group's selection model.
 */
export interface ToolbarToggleItemProps extends ToggleGroupItemProps {}
</script>

<script setup lang="ts">
import { ToggleGroupItem } from '../../forms/toggle-group';
import { useForwardExpose } from '@robonen/vue';
import ToolbarButton from './ToolbarButton.vue';

const { as, value, disabled } = defineProps<ToolbarToggleItemProps>();
const { forwardRef } = useForwardExpose();
</script>

<template>
  <ToolbarButton as="template" :disabled="disabled">
    <ToggleGroupItem
      :ref="forwardRef"
      :value="value"
      :disabled="disabled"
      :as="as"
    >
      <slot />
    </ToggleGroupItem>
  </ToolbarButton>
</template>
