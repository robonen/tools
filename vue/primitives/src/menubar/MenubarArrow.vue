<script lang="ts">
import type { MenuArrowProps } from '../menu';

export interface MenubarArrowProps extends MenuArrowProps {}
</script>

<script setup lang="ts">
import { MenuArrow } from '../menu';

const props = defineProps<MenubarArrowProps>();
</script>

<template>
  <MenuArrow v-bind="props"><slot /></MenuArrow>
</template>
