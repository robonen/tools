<script lang="ts">
import type { PrimitiveProps } from '../primitive';
import type { AvatarImageLoadingStatus } from './context';

/**
 * The image to display. It loads the `src` out of band and only renders once
 * the image has successfully loaded, reporting its loading status to the root
 * so the fallback can take over while loading or on error.
 */
export interface AvatarImageProps extends PrimitiveProps {
  /** Image source URL — loaded out of band before the image is shown. */
  src?: string;
  /** Alternative text describing the image. */
  alt?: string;
  /** Called whenever the image's loading status changes (`idle`/`loading`/`loaded`/`error`). */
  onLoadingStatusChange?: (status: AvatarImageLoadingStatus) => void;
}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useAvatarContext } from './context';
import { useForwardExpose } from '@robonen/vue';

const { as = 'img', src, alt, onLoadingStatusChange } = defineProps<AvatarImageProps>();

const { forwardRef } = useForwardExpose();

const ctx = useAvatarContext();

const status = ref<AvatarImageLoadingStatus>('idle');

function setStatus(next: AvatarImageLoadingStatus) {
  status.value = next;
  ctx.onImageLoadingStatusChange(next);
  onLoadingStatusChange?.(next);
}

let currentImage: HTMLImageElement | null = null;

function load(nextSrc: string | undefined) {
  if (currentImage) {
    currentImage.onload = null;
    currentImage.onerror = null;
    currentImage = null;
  }
  if (!nextSrc) {
    setStatus('error');
    return;
  }
  if (globalThis.window === undefined) {
    setStatus('loading');
    return;
  }
  setStatus('loading');
  const img = new globalThis.Image();
  currentImage = img;
  img.onload = () => {
    if (currentImage === img) setStatus('loaded');
  };
  img.onerror = () => {
    if (currentImage === img) setStatus('error');
  };
  img.src = nextSrc;
}

watch(() => src, load, { immediate: true });

onBeforeUnmount(() => {
  if (currentImage) {
    currentImage.onload = null;
    currentImage.onerror = null;
    currentImage = null;
  }
});

const shouldRender = computed(() => status.value === 'loaded');
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    v-if="shouldRender"
    :src="src"
    :alt="alt"
  />
</template>
