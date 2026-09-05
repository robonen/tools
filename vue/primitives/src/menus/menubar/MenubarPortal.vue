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
import { useForwardProps } from '@robonen/vue';

const props = defineProps<MenubarPortalProps>();
// Forward only what the consumer set: a spread would also hand down Vue's
// `false` for every absent Boolean and override the child's own defaults.
const forwardedProps = useForwardProps(props);
</script>

<template>
  <MenuPortal v-bind="forwardedProps"><slot /></MenuPortal>
</template>
