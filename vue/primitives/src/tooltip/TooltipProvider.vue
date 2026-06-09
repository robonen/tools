<script lang="ts">
/**
 * Wraps a group of tooltips to share open/close timing and global behavior.
 * Place it high in the tree (often at the app root); every `TooltipRoot` must
 * have a Provider ancestor. It governs the hover `delayDuration` and the
 * `skipDelayDuration` window that lets neighboring tooltips open instantly once
 * one has shown, plus group-wide defaults each `TooltipRoot` may override.
 */
export interface TooltipProviderProps {
  /**
   * Hover delay before opening, in ms.
   * @default 700
   */
  delayDuration?: number;
  /**
   * After a tooltip closes, subsequent tooltips open without delay for this many ms.
   * @default 300
   */
  skipDelayDuration?: number;
  /**
   * When `true`, the tooltip closes as soon as the pointer leaves the trigger
   * (hoverable content disabled). Has a11y consequences.
   * @default false
   */
  disableHoverableContent?: boolean;
  /**
   * When `true`, clicking the trigger does not close the tooltip.
   * @default false
   */
  disableClosingTrigger?: boolean;
  /**
   * Disable all tooltips inside this provider.
   * @default false
   */
  disabled?: boolean;
  /**
   * Skip opening on focus that did not come from the keyboard
   * (matched via `:focus-visible`).
   * @default false
   */
  ignoreNonKeyboardFocus?: boolean;
}
</script>

<script setup lang="ts">
import { onScopeDispose, ref, toRef } from 'vue';
import { provideTooltipProviderContext } from './context';

defineOptions({ inheritAttrs: false });

const {
  delayDuration = 700,
  skipDelayDuration = 300,
  disableHoverableContent = false,
  disableClosingTrigger = false,
  disabled = false,
  ignoreNonKeyboardFocus = false,
} = defineProps<TooltipProviderProps>();

const isOpenDelayed = ref(true);
const isPointerInTransitRef = ref(false);

let skipTimer: ReturnType<typeof setTimeout> | undefined;
function clearSkipTimer() {
  if (skipTimer !== undefined) {
    clearTimeout(skipTimer);
    skipTimer = undefined;
  }
}
onScopeDispose(clearSkipTimer);

provideTooltipProviderContext({
  isOpenDelayed,
  delayDuration: toRef(() => delayDuration),
  skipDelayDuration: toRef(() => skipDelayDuration),
  disableHoverableContent: toRef(() => disableHoverableContent),
  disableClosingTrigger: toRef(() => disableClosingTrigger),
  disabled: toRef(() => disabled),
  ignoreNonKeyboardFocus: toRef(() => ignoreNonKeyboardFocus),
  isPointerInTransitRef,
  onOpen() {
    clearSkipTimer();
    isOpenDelayed.value = false;
  },
  onClose() {
    clearSkipTimer();
    skipTimer = setTimeout(() => {
      isOpenDelayed.value = true;
    }, skipDelayDuration);
  },
});
</script>

<template>
  <slot />
</template>
