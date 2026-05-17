<script lang="ts">
import type { PopperArrowProps } from '../popper';

export interface MenuArrowProps extends PopperArrowProps {}
</script>

<script setup lang="ts">
import { PopperArrow } from '../popper';

const props = defineProps<MenuArrowProps>();
</script>

<template>
  <PopperArrow v-bind="props">
    <slot />
  </PopperArrow>
</template>
