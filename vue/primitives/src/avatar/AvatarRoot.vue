<script lang="ts">
import type { PrimitiveProps } from '../primitive';

export interface AvatarRootProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import type { AvatarImageLoadingStatus } from './context';
import { Primitive } from '../primitive';
import { provideAvatarContext } from './context';
import { ref } from 'vue';
import { useForwardExpose } from '@robonen/vue';

const { as = 'span' } = defineProps<AvatarRootProps>();

const { forwardRef } = useForwardExpose();

const imageLoadingStatus = ref<AvatarImageLoadingStatus>('idle');

provideAvatarContext({
  imageLoadingStatus,
  onImageLoadingStatusChange: (status) => { imageLoadingStatus.value = status; },
});
</script>

<template>
  <Primitive :ref="forwardRef" :as="as" :data-status="imageLoadingStatus">
    <slot />
  </Primitive>
</template>
