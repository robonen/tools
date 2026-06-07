<script setup lang="ts">
import type { ReferenceElement } from '@floating-ui/vue';
import { providePopperRootContext } from './context';
import { ref } from 'vue';

defineOptions({ inheritAttrs: false });

const anchor = ref<ReferenceElement>();

providePopperRootContext({
  anchor,
  onAnchorChange: (element: ReferenceElement | undefined) => { anchor.value = element; },
});
</script>

<template>
  <slot />
</template>
