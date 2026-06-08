<script lang="ts">
import type { MenuArrowProps } from '../menu';

export interface DropdownMenuArrowProps extends MenuArrowProps {}
</script>

<script setup lang="ts">
import { MenuArrow } from '../menu';

const props = defineProps<DropdownMenuArrowProps>();
</script>

<template>
  <MenuArrow v-bind="props"><slot /></MenuArrow>
</template>
