<script lang="ts">
import type { PopperAnchorProps } from '../popper';

/**
 * An optional positioning anchor for the menu content. Render it around the
 * element the menu should attach to when the open trigger is not itself the
 * anchor (for example, anchoring a dropdown to a virtual element or the
 * pointer). When omitted, content is positioned relative to its trigger.
 */
export interface MenuAnchorProps extends PopperAnchorProps {}
</script>

<script setup lang="ts">
import { PopperAnchor } from '../popper';

const props = defineProps<MenuAnchorProps>();
</script>

<template>
  <PopperAnchor v-bind="props">
    <slot />
  </PopperAnchor>
</template>
