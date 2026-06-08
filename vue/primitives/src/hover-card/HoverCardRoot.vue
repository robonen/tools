<script lang="ts">
export interface HoverCardRootProps {
  /** Controlled open state. Bind with `v-model:open`. */
  open?: boolean;
  /** Initial open state for uncontrolled usage. */
  defaultOpen?: boolean;
  /** Delay (ms) before the content opens after pointer enters trigger. */
  openDelay?: number;
  /** Delay (ms) before the content closes after pointer leaves trigger/content. */
  closeDelay?: number;
}
</script>

<script setup lang="ts">
import { computed, onScopeDispose, ref } from 'vue';
import { PopperRoot } from '../popper';
import { provideHoverCardContext } from './context';

const { openDelay = 700, closeDelay = 300, defaultOpen = false } = defineProps<HoverCardRootProps>();

const openModel = defineModel<boolean | undefined>('open', { default: undefined });
const uncontrolled = ref(defaultOpen);

// `open` intentionally shares the model name: it's a local read-only computed that
// resolves the controlled model against the uncontrolled fallback. Safe in script-setup.
// eslint-disable-next-line vue/no-dupe-keys
const open = computed(() => openModel.value ?? uncontrolled.value);

function setOpen(value: boolean) {
  if (openModel.value === undefined) uncontrolled.value = value;
  openModel.value = value;
}

let openTimer = 0;
let closeTimer = 0;

function clearOpenTimer() {
  if (openTimer) {
    clearTimeout(openTimer);
    openTimer = 0;
  }
}

function clearCloseTimer() {
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = 0;
  }
}

const hasSelection = ref(false);
const isPointerDownOnContent = ref(false);
const isPointerInTransit = ref(false);
const trigger = ref<HTMLElement | undefined>();

function onOpen() {
  clearCloseTimer();
  if (openDelay <= 0) {
    setOpen(true);
    return;
  }
  openTimer = globalThis.setTimeout(() => {
    setOpen(true);
    openTimer = 0;
  }, openDelay);
}

function onClose() {
  clearOpenTimer();
  if (hasSelection.value || isPointerDownOnContent.value) return;
  if (closeDelay <= 0) {
    setOpen(false);
    return;
  }
  closeTimer = globalThis.setTimeout(() => {
    setOpen(false);
    closeTimer = 0;
  }, closeDelay);
}

function onDismiss() {
  clearOpenTimer();
  clearCloseTimer();
  setOpen(false);
}

onScopeDispose(() => {
  clearOpenTimer();
  clearCloseTimer();
});

provideHoverCardContext({
  open,
  onOpenChange: setOpen,
  onOpen,
  onClose,
  onDismiss,
  hasSelection,
  isPointerDownOnContent,
  isPointerInTransit,
  trigger,
  onTriggerChange(el) {
    trigger.value = el;
  },
});

defineSlots<{
  default?: (props: { open: boolean }) => any;
}>();
</script>

<template>
  <PopperRoot>
    <slot :open="open" />
  </PopperRoot>
</template>
