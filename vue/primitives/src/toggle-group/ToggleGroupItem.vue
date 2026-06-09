<script lang="ts">
import type { PrimitiveProps } from '../primitive';
/**
 * A single toggle button within a `ToggleGroupRoot`, rendered as a native
 * `<button>`. Clicking or pressing Space toggles its `value` on or off; it
 * reflects its pressed state via `data-state` (`on`/`off`) and participates in
 * the group's roving tab order. Must be used inside a `ToggleGroupRoot`, whose
 * `type` determines whether selecting it deselects its siblings.
 */
export interface ToggleGroupItemProps extends PrimitiveProps {
  value: string;
  disabled?: boolean;

}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { Primitive } from '../primitive';
import { useCollectionInjector } from '../collection';
import { useForwardExpose } from '@robonen/vue';
import { useToggleGroupContext } from './context';

const { value, disabled = false, as = 'button' } = defineProps<ToggleGroupItemProps>();

const ctx = useToggleGroupContext();
const { CollectionItem } = useCollectionInjector();
const { forwardRef, currentElement } = useForwardExpose();

const isDisabled = computed(() => ctx.disabled.value || disabled);
const isPressed = computed(() => ctx.isPressed(value));

// Roving focus: only one enabled item is the tabstop (first pressed, else first enabled).
const isTabStop = computed(() => {
  if (!ctx.rovingFocus.value || isDisabled.value) return !ctx.rovingFocus.value && !isDisabled.value;
  const enabled = ctx.items.value.filter(x => !x.hasAttribute('data-disabled'));
  if (enabled.length === 0) return false;
  const firstPressed = enabled.find(n => n.getAttribute('aria-pressed') === 'true' || n.getAttribute('aria-checked') === 'true');
  const target = firstPressed ?? enabled[0];
  return currentElement.value === target;
});

function onClick(): void {
  if (isDisabled.value) return;
  ctx.toggle(value);
}
function onKeyDown(event: KeyboardEvent): void {
  if (!currentElement.value) return;
  ctx.onItemKeyDown(event, currentElement.value);
}
</script>

<template>
  <CollectionItem>
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
    >
      <slot :pressed="isPressed" />
    </Primitive>
  </CollectionItem>
</template>
