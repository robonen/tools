<script lang="ts">
import type { MenuPortalProps } from '../menu';

export interface MenubarPortalProps extends MenuPortalProps {}
</script>

<script setup lang="ts">
import { MenuPortal } from '../menu';

const props = defineProps<MenubarPortalProps>();
</script>

<template>
  <MenuPortal v-bind="props"><slot /></MenuPortal>
</template>
