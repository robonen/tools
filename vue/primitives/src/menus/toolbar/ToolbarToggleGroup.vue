<script lang="ts">
import type { ToggleGroupRootEmits, ToggleGroupRootProps } from '../../forms/toggle-group';

/**
 * A `ToggleGroupRoot` adapted for use inside a `ToolbarRoot`. It forwards the
 * toolbar's orientation and reading direction, and disables the toggle group's
 * own roving focus (`rovingFocus={false}`) so the toolbar stays the single
 * keyboard-navigation owner — otherwise two competing roving controllers would
 * fight over arrow keys. Supports the same single / multiple `v-model`,
 * `defaultValue`, `type`, `disabled` and `loop` as `ToggleGroupRoot`.
 */
export interface ToolbarToggleGroupProps
  extends Omit<ToggleGroupRootProps, 'rovingFocus' | 'orientation' | 'dir'> {}

export type ToolbarToggleGroupEmits = ToggleGroupRootEmits;
</script>

<script setup lang="ts">
import { ToggleGroupRoot } from '../../forms/toggle-group';
import { useForwardExpose } from '@robonen/vue';
import { useToolbarContext } from './context';

// No `defineProps`: every consumer prop (`modelValue`, `defaultValue`, `type`,
// `disabled`, `loop`) plus the `onUpdate:modelValue` / `onValueChange`
// listeners stay in `$attrs` so they forward verbatim to `ToggleGroupRoot`.
// `ToolbarToggleGroupProps` / `ToolbarToggleGroupEmits` are exported purely for
// the public type surface.
defineOptions({ inheritAttrs: false });

const ctx = useToolbarContext();
useForwardExpose();
</script>

<template>
  <ToggleGroupRoot
    v-bind="$attrs"
    :orientation="ctx.orientation.value"
    :dir="ctx.direction.value"
    :roving-focus="false"
    :data-orientation="ctx.orientation.value"
  >
    <slot />
  </ToggleGroupRoot>
</template>
