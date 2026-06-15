<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * Excludes its subtree from the screen-reader announcement harvested by
 * `ToastAnnounce`. Use it around content whose visible text is meaningless out
 * of context (e.g. an icon-only button) — optionally provide `altText` to be
 * announced in its place. `ToastAction` and `ToastClose` use this internally.
 */
export interface ToastAnnounceExcludeProps extends PrimitiveProps {
  /** Text announced in place of the excluded subtree. */
  altText?: string;
}
</script>

<script setup lang="ts">
import { Primitive } from '../../internal/primitive';

const { as = 'div', altText } = defineProps<ToastAnnounceExcludeProps>();
</script>

<template>
  <Primitive
    :as="as"
    data-primitives-toast-announce-exclude=""
    :data-primitives-toast-announce-alt="altText || undefined"
  >
    <slot />
  </Primitive>
</template>
