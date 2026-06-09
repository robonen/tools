<script lang="ts">
import type { TeleportPrimitiveProps } from '../teleport';

/**
 * Teleports the Overlay and Content out of the normal DOM flow (by default into
 * `body`) so they render above the rest of the page and escape `overflow`/
 * stacking contexts. Mounts its children only while the dialog is open.
 */
export interface DialogPortalProps extends TeleportPrimitiveProps {
  /**
   * When true the Portal (and its descendants) remain mounted even when the
   * dialog is closed. Consumers use this to drive exit animations via CSS.
   * @default false
   */
  forceMount?: boolean;
}
</script>

<script setup lang="ts">
import PortalPrimitive from '../teleport/Teleport.vue';
import { Presence } from '../presence';
import { useDialogContext } from './context';

const {
  to,
  disabled,
  defer,
  forceMount = false,
} = defineProps<DialogPortalProps>();

const ctx = useDialogContext();
</script>

<template>
  <Presence :present="ctx.open.value" :force-mount="forceMount">
    <PortalPrimitive :to="to" :disabled="disabled" :defer="defer">
      <slot :present="ctx.open.value" />
    </PortalPrimitive>
  </Presence>
</template>
