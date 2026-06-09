<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * An image element representing a user, with a graceful text/icon fallback for
 * when the image is loading or fails to load. Use it for profile pictures in
 * avatars, comment threads, member lists, or anywhere a user identity is shown
 * and you need a reliable placeholder.
 *
 * The root tracks the image's loading status and provides it via context so
 * `AvatarImage` and `AvatarFallback` can coordinate which one is rendered. It
 * exposes the current status on the `data-status` attribute for styling.
 */
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
