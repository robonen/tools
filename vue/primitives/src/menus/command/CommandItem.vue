<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A selectable option in the list. Registers itself with the root (so it can be
 * filtered, highlighted, and selected), reflects highlight/selection/disabled
 * state via data attributes, and emits `select` when chosen by click or Enter.
 */
export interface CommandItemProps extends PrimitiveProps {
  /** Item value — the identity used by selection and `data-value`. */
  value: string;
  /**
   * Plain-text representation the filter should match against. Use it when the
   * `value` is an opaque identity key and the searchable label differs (e.g.
   * non-text children). Falls back to `value` when omitted.
   */
  textValue?: string;
  /** Extra terms the default filter should match against. */
  keywords?: string[];
  /** Disable this item — it is skipped by keyboard nav and filtering. */
  disabled?: boolean;
  /** Render even when filtered out. */
  forceMount?: boolean;
}

export interface CommandItemEmits {
  select: [value: string];
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import { provideCommandItemContext, useCommandContext, useCommandGroupContext } from './context';

const {
  as = 'div',
  value,
  textValue,
  keywords,
  disabled = false,
  forceMount = false,
} = defineProps<CommandItemProps>();

const emit = defineEmits<CommandItemEmits>();

const { forwardRef } = useForwardExpose();
const ctx = useCommandContext();

let groupCtx: ReturnType<typeof useCommandGroupContext> | null = null;
try {
  groupCtx = useCommandGroupContext();
}
catch {
  groupCtx = null;
}

const itemId = computed(() => ctx.getItemId(value));
const isVisible = computed(() => forceMount || ctx.filteredItems.value.has(value));
const isHighlighted = computed(() => ctx.selectedValue.value === value);
const isSelected = computed(() => ctx.modelValue.value === value);

provideCommandItemContext({ isSelected });

function syncRegistration() {
  ctx.registerItem({
    value,
    textValue: textValue ?? value,
    keywords: keywords ?? [],
    disabled,
    onSelect: () => emit('select', value),
  });
}

onMounted(() => {
  syncRegistration();
  if (groupCtx) ctx.registerGroupItem(groupCtx.id.value, value);
});

watch(
  () => [value, textValue, disabled, (keywords ?? []).join('\u0001')] as const,
  (_next, prev) => {
    const [prevValue] = prev ?? [];
    if (prevValue !== undefined && prevValue !== value) {
      ctx.unregisterItem(prevValue);
      if (groupCtx) ctx.unregisterGroupItem(groupCtx.id.value, prevValue);
      syncRegistration();
      if (groupCtx) ctx.registerGroupItem(groupCtx.id.value, value);
    }
    else {
      syncRegistration();
    }
  },
);

onBeforeUnmount(() => {
  ctx.unregisterItem(value);
  if (groupCtx) ctx.unregisterGroupItem(groupCtx.id.value, value);
});

function handlePointerMove(event: PointerEvent) {
  if (disabled) return;
  // Only react to genuine mouse / pen movement; keyboard nav already manages highlight.
  if (event.pointerType === 'touch') return;
  if (ctx.selectedValue.value !== value) ctx.setSelectedValue(value);
}

function handleClick(event: MouseEvent) {
  if (disabled) {
    event.preventDefault();
    return;
  }
  event.preventDefault();
  ctx.setSelectedValue(value);
  ctx.commitSelected();
}
</script>

<template>
  <Primitive
    v-show="isVisible"
    :ref="forwardRef"
    :id="itemId"
    :as="as"
    role="option"
    :aria-selected="isSelected || undefined"
    :aria-disabled="disabled || undefined"
    :data-state="isHighlighted ? 'selected' : ''"
    :data-highlighted="isHighlighted ? '' : undefined"
    :data-selected="isSelected ? '' : undefined"
    :data-disabled="disabled ? '' : undefined"
    :data-primitives-state="isVisible ? 'visible' : 'hidden'"
    :tabindex="-1"
    data-primitives-command-item
    :data-value="value"
    @click="handleClick"
    @pointermove="handlePointerMove"
  >
    <slot :highlighted="isHighlighted" :selected="isSelected" :disabled="disabled" />
  </Primitive>
</template>
