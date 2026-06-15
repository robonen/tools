<script lang="ts">
import type { MenuPortalProps } from '../menu';

/**
 * Teleports a menu's content into the document body (or a chosen target) so it
 * renders above other content and escapes any `overflow: hidden` ancestor.
 */
export interface MenubarPortalProps extends MenuPortalProps {}
</script>

<script setup lang="ts">
import { MenuPortal } from '../menu';

const props = defineProps<MenubarPortalProps>();
</script>

<template>
  <MenuPortal v-bind="props"><slot /></MenuPortal>
</template>
