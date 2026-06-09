<script lang="ts">
/**
 * A small floating label that appears on hover or keyboard focus to describe an
 * otherwise non-obvious control (such as an icon-only button). Composed from a
 * Trigger, a Portal, and Content (with an optional Arrow); positioning is handled
 * by the underlying Popper. Tooltips are pointer/focus driven and non-interactive
 * by design — reach for Popover when the overlay needs focusable content.
 *
 * Root owns the per-tooltip open state and provides context to every part. Each
 * Root must live inside a `TooltipProvider`, which supplies shared delay/skip
 * timing for a group of tooltips. Bind `v-model:open` to control it, or rely on
 * the Trigger for uncontrolled use. Props here override the matching Provider
 * defaults for this one tooltip.
 */
export interface TooltipRootProps {
  /** Initial open state in uncontrolled mode. */
  defaultOpen?: boolean;
  /**
   * Per-tooltip override for the provider's `delayDuration`.
   * @default 700
   */
  delayDuration?: number;
  /**
   * Per-tooltip override for the provider's `disableHoverableContent`.
   */
  disableHoverableContent?: boolean;
  /**
   * Per-tooltip override for the provider's `disableClosingTrigger`.
   */
  disableClosingTrigger?: boolean;
  /**
   * Per-tooltip override for the provider's `disabled`.
   */
  disabled?: boolean;
  /**
   * Per-tooltip override for the provider's `ignoreNonKeyboardFocus`.
   */
  ignoreNonKeyboardFocus?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onScopeDispose, ref } from 'vue';
import { provideTooltipContext, useTooltipProviderContext } from './context';
import { PopperRoot } from '../popper';
import { TOOLTIP_OPEN_EVENT } from './utils';
import { useId } from '../config-provider';

defineOptions({ inheritAttrs: false });

const {
  defaultOpen = false,
  delayDuration: delayDurationProp,
  disableHoverableContent: disableHoverableContentProp,
  disableClosingTrigger: disableClosingTriggerProp,
  disabled: disabledProp,
  ignoreNonKeyboardFocus: ignoreNonKeyboardFocusProp,
} = defineProps<TooltipRootProps>();

defineSlots<{
  default?: (props: { open: boolean }) => unknown;
}>();

const providerCtx = useTooltipProviderContext();

const local = ref<boolean>(defaultOpen);
const open = defineModel<boolean>('open', {
  default: undefined,
  get: external => external ?? local.value,
  set: (value) => {
    local.value = value;
    return value;
  },
});

const delayDuration = computed(() => delayDurationProp ?? providerCtx.delayDuration.value);
const disableHoverableContent = computed(
  () => disableHoverableContentProp ?? providerCtx.disableHoverableContent.value,
);
const disableClosingTrigger = computed(
  () => disableClosingTriggerProp ?? providerCtx.disableClosingTrigger.value,
);
const disabled = computed(() => disabledProp ?? providerCtx.disabled.value);
const ignoreNonKeyboardFocus = computed(
  () => ignoreNonKeyboardFocusProp ?? providerCtx.ignoreNonKeyboardFocus.value,
);

const wasOpenDelayed = ref(false);
const trigger = ref<HTMLElement>();
const contentId = useId(undefined, 'tooltip-content');

const stateAttribute = computed<'closed' | 'delayed-open' | 'instant-open'>(() => {
  if (!open.value) return 'closed';
  return wasOpenDelayed.value ? 'delayed-open' : 'instant-open';
});

let openTimer: ReturnType<typeof setTimeout> | undefined;
function clearOpenTimer() {
  if (openTimer !== undefined) {
    clearTimeout(openTimer);
    openTimer = undefined;
  }
}
onScopeDispose(clearOpenTimer);

function dispatchOpenEvent() {
  if (typeof document === 'undefined') return;
  document.dispatchEvent(new CustomEvent(TOOLTIP_OPEN_EVENT));
}

function handleOpen() {
  clearOpenTimer();
  wasOpenDelayed.value = false;
  if (!open.value) {
    open.value = true;
    providerCtx.onOpen();
    dispatchOpenEvent();
  }
}

function handleClose() {
  clearOpenTimer();
  if (open.value) {
    open.value = false;
    providerCtx.onClose();
  }
}

function handleDelayedOpen() {
  clearOpenTimer();
  openTimer = setTimeout(() => {
    wasOpenDelayed.value = true;
    if (!open.value) {
      open.value = true;
      providerCtx.onOpen();
      dispatchOpenEvent();
    }
  }, delayDuration.value);
}

provideTooltipContext({
  contentId,
  open,
  stateAttribute,
  trigger,
  disableHoverableContent,
  disableClosingTrigger,
  disabled,
  ignoreNonKeyboardFocus,
  onTriggerChange(el) {
    trigger.value = el;
  },
  onTriggerEnter() {
    if (providerCtx.isOpenDelayed.value) handleDelayedOpen();
    else handleOpen();
  },
  onTriggerLeave() {
    if (disableHoverableContent.value) handleClose();
    else clearOpenTimer();
  },
  onOpen: handleOpen,
  onClose: handleClose,
});
</script>

<template>
  <PopperRoot>
    <slot :open="open" />
  </PopperRoot>
</template>
