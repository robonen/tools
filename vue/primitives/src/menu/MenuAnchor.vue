<script lang="ts">
import type { PopperAnchorProps } from '../popper';

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
