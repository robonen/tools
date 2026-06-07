<script lang="ts">
export interface TeleportPrimitiveProps {
  /**
   * Target DOM node or CSS selector. When `null`/`undefined`, Vue's built-in
   * `<Teleport>` is rendered with its default behavior (body).
   */
  to?: string | HTMLElement | null;

  /**
   * Defer teleport rendering until after the parent has mounted.
   * Useful when the target node is rendered by the same component tree.
   * @default false
   */
  defer?: boolean;

  /**
   * Disable teleport — children render in place. SSR-safe default.
   * @default false
   */
  disabled?: boolean;

  /**
   * Forcibly keep children mounted even when Teleport is disabled/removed.
   * Opt-in escape hatch for animation-aware primitives.
   * @default true
   */
  forceMount?: boolean;
}

export default {
  inheritAttrs: false,
};
</script>

<script setup lang="ts">
import { isClient } from '@robonen/platform/multi';
import { useConfig } from '../config-provider';
import { computed } from 'vue';

const {
  to,
  defer = false,
  disabled = false,
  forceMount = true,
} = defineProps<TeleportPrimitiveProps>();

const config = useConfig();

// On the server, Vue's Teleport is a no-op for most targets; we also opt-out
// explicitly when `isClient` is false to avoid hydration mismatches when the
// target hasn't mounted yet.
const effectiveDisabled = computed(() => disabled || !isClient);
const target = computed(() => to ?? config.teleportTarget.value);
</script>

<template>
  <Teleport
    v-if="forceMount || !effectiveDisabled"
    :to="target"
    :defer="defer"
    :disabled="effectiveDisabled"
  >
    <slot />
  </Teleport>
</template>
