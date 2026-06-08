<script lang="ts">
export interface PopoverRootProps {
  /** Uncontrolled initial open state. Ignored once `v-model:open` is bound. */
  defaultOpen?: boolean;
  /**
   * Modal mode traps focus, locks scroll, and disables outside pointer events.
   * @default false
   */
  modal?: boolean;
}
</script>

<script setup lang="ts">
import { ref, toRef } from 'vue';
import { PopperRoot } from '../popper';
import { providePopoverContext } from './context';
import { useId } from '../config-provider';

defineOptions({ inheritAttrs: false });

const { defaultOpen = false, modal = false } = defineProps<PopoverRootProps>();

const localOpen = ref<boolean>(defaultOpen);

const open = defineModel<boolean>('open', {
  default: undefined,
  get: v => v ?? localOpen.value,
  set: (v) => {
    localOpen.value = v;
    return v;
  },
});

const triggerId = useId(undefined, 'popover-trigger');
const contentId = useId(undefined, 'popover-content');
const triggerElement = ref<HTMLElement>();
const hasCustomAnchor = ref(false);

providePopoverContext({
  open,
  // Identity passthrough via `toRef` — reactive without `computed`'s effect/cache.
  modal: toRef(() => modal),
  triggerId,
  contentId,
  triggerElement,
  hasCustomAnchor,
  onOpenChange: (value) => { open.value = value; },
  onOpenToggle: () => { open.value = !open.value; },
});
</script>

<template>
  <PopperRoot>
    <slot :open="open" :close="() => open = false" />
  </PopperRoot>
</template>
