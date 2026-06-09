<script lang="ts">
/**
 * A window overlaid on the page that interrupts the rest of the app while it is
 * open — used for tasks like forms, confirmations, or detail views that should
 * sit above the current context. Composed from a Trigger, a Portal, an Overlay,
 * and Content (with Title, Description, and Close).
 *
 * Root manages the open state and provides context to every part. Bind
 * `v-model:open` to control it, or rely on the Trigger/Close for uncontrolled
 * use. Modal by default (traps focus, locks scroll, marks the rest of the
 * document inert); set `modal="false"` for a non-blocking dialog. For
 * destructive confirmations that demand an explicit choice, prefer AlertDialog.
 */
export interface DialogRootProps {
  /** Uncontrolled initial open state. Ignored once `v-model:open` is bound. */
  defaultOpen?: boolean;
  /**
   * Modal mode traps focus inside the content, locks body scroll, and marks
   * the rest of the document as inert.
   * @default true
   */
  modal?: boolean;
}
</script>

<script setup lang="ts">
import { ref, toRef } from 'vue';
import { useId } from '../config-provider';
import { provideDialogContext } from './context';

defineOptions({ inheritAttrs: false });

const { defaultOpen = false, modal = true } = defineProps<DialogRootProps>();

// v-model:open — undefined means the parent hasn't bound a value; we fall
// back to an internal ref (uncontrolled mode) and still forward writes.
const localOpen = ref<boolean>(defaultOpen);

const open = defineModel<boolean>('open', {
  default: undefined,
  get: v => v ?? localOpen.value,
  set: (v) => {
    localOpen.value = v;
    return v;
  },
});

const triggerId = useId(undefined, 'dialog-trigger');
const contentId = useId(undefined, 'dialog-content');

const titleId = ref<string | undefined>(undefined);
const descriptionId = ref<string | undefined>(undefined);

const triggerElement = ref<HTMLElement | undefined>(undefined);
const contentElement = ref<HTMLElement | undefined>(undefined);

// Identity passthrough — `toRef` with a getter returns a `GetterRefImpl`:
// reactive `Ref` without the `ReactiveEffect`/cache that `computed` allocates.
const modalRef = toRef(() => modal);

provideDialogContext({
  open,
  modal: modalRef,
  triggerId,
  contentId,
  titleId,
  descriptionId,
  triggerElement,
  contentElement,
  onOpen: () => { open.value = true; },
  onClose: () => { open.value = false; },
  onToggle: () => { open.value = !open.value; },
});
</script>

<template>
  <slot :open="open" />
</template>
