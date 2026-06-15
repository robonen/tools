<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';
import type { ToggleGroupValue } from './context';
/**
 * A single toggle button within a `ToggleGroupRoot`, rendered as a native
 * `<button>`. Clicking or pressing Space toggles its `value` on or off; it
 * reflects its pressed state via `data-state` (`on`/`off`) and participates in
 * the group's roving tab order. Must be used inside a `ToggleGroupRoot`, whose
 * `type` determines whether selecting it deselects its siblings. The `value`
 * may be any structural value (string, number, bigint, `null`, or a plain
 * object), compared with deep equality.
 */
export interface ToggleGroupItemProps extends PrimitiveProps {
  value: ToggleGroupValue;
  disabled?: boolean;

}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { Primitive } from '../../internal/primitive';
import { useCollectionInjector } from '../../utilities/collection';
import { useForwardExpose } from '@robonen/vue';
import { useToggleGroupContext } from './context';

const { value, disabled = false, as = 'button' } = defineProps<ToggleGroupItemProps>();

const ctx = useToggleGroupContext();
const { CollectionItem } = useCollectionInjector();
const { forwardRef, currentElement } = useForwardExpose();

const isDisabled = computed(() => ctx.disabled.value || disabled);
const isPressed = computed(() => ctx.isPressed(value));

// Roving focus: only one enabled item is the tabstop (first pressed, else first
// enabled). The tab-stop element is computed once in the Root from reactive
// pressed state and shared via context, so each item only does an O(1) identity
// check here instead of re-scanning the whole list and reading DOM attributes.
const isTabStop = computed(() => {
  if (!ctx.rovingFocus.value || isDisabled.value) return !ctx.rovingFocus.value && !isDisabled.value;
  return currentElement.value === ctx.tabStopElement.value;
});

function onClick(): void {
  if (isDisabled.value) return;
  ctx.toggle(value);
}
function onKeyDown(event: KeyboardEvent): void {
  if (!currentElement.value) return;
  // A native <button> activates on Space/Enter itself; synthesize activation
  // for non-button hosts so they still toggle from the keyboard.
  if (as !== 'button' && (event.key === ' ' || event.key === 'Enter')) {
    event.preventDefault();
    onClick();
    return;
  }
  ctx.onItemKeyDown(event, currentElement.value);
}
// Safari does not focus buttons on click; focus on mousedown so the roving
// tab-stop and :focus-visible styling stay consistent across browsers.
function onMouseDown(event: MouseEvent): void {
  if (isDisabled.value) {
    event.preventDefault();
    return;
  }
  currentElement.value?.focus();
}
</script>

<template>
  <CollectionItem :value="value">
    <Primitive
      :as="as"
      :ref="forwardRef"
      :type="as === 'button' ? 'button' : undefined"
      :role="ctx.type.value === 'single' ? 'radio' : undefined"
      :aria-pressed="ctx.type.value === 'multiple' ? isPressed : undefined"
      :aria-checked="ctx.type.value === 'single' ? isPressed : undefined"
      :aria-disabled="isDisabled || undefined"
      :data-state="isPressed ? 'on' : 'off'"
      :data-disabled="isDisabled ? '' : undefined"
      :tabindex="isDisabled ? -1 : (ctx.rovingFocus.value ? (isTabStop ? 0 : -1) : 0)"
      :disabled="isDisabled || undefined"
      @click="onClick"
      @keydown="onKeyDown"
      @mousedown="onMouseDown"
    >
      <slot :pressed="isPressed" />
    </Primitive>
  </CollectionItem>
</template>
