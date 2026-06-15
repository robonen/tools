<script lang="ts">
import type { ImgHTMLAttributes } from 'vue';
import type { PrimitiveProps } from '../../internal/primitive';
import type { AvatarImageLoadingStatus } from './context';

/**
 * The image to display. It loads the `src` out of band and only renders once
 * the image has successfully loaded, reporting its loading status to the root
 * so the fallback can take over while loading or on error.
 *
 * A browser-cached image is detected synchronously, so an already-loaded
 * avatar shows instantly without a fallback flash.
 */
export interface AvatarImageProps extends PrimitiveProps {
  /** Image source URL — loaded out of band before the image is shown. */
  src?: string;
  /** Alternative text describing the image. */
  alt?: string;
  /**
   * Referrer policy applied to both the out-of-band preload and the rendered
   * image, so the displayed `<img>` reuses the preload cache entry.
   */
  referrerPolicy?: ImgHTMLAttributes['referrerpolicy'];
  /**
   * CORS setting applied to both the out-of-band preload and the rendered
   * image (required for canvas tainting / credentialed CDNs and cache reuse).
   */
  crossOrigin?: ImgHTMLAttributes['crossorigin'];
  /** Called whenever the image's loading status changes (`idle`/`loading`/`loaded`/`error`). */
  onLoadingStatusChange?: (status: AvatarImageLoadingStatus) => void;
}

export interface AvatarImageEmits {
  /** Emitted whenever the image's loading status changes. */
  loadingStatusChange: [status: AvatarImageLoadingStatus];
}
</script>

<script setup lang="ts">
import { Primitive } from '../../internal/primitive';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useAvatarContext } from './context';
import { useForwardExpose } from '@robonen/vue';

const { as = 'img', src, alt, referrerPolicy, crossOrigin, onLoadingStatusChange } = defineProps<AvatarImageProps>();

const emit = defineEmits<AvatarImageEmits>();

const { forwardRef } = useForwardExpose();

const ctx = useAvatarContext();

const status = ref<AvatarImageLoadingStatus>('idle');

function setStatus(next: AvatarImageLoadingStatus) {
  status.value = next;
  ctx.onImageLoadingStatusChange(next);
  onLoadingStatusChange?.(next);
  emit('loadingStatusChange', next);
}

let currentImage: HTMLImageElement | null = null;

function detachCurrent() {
  if (currentImage) {
    currentImage.onload = null;
    currentImage.onerror = null;
    currentImage = null;
  }
}

// A `load`/`onload` event can still fire for a degenerate (0×0) response, so a
// real image is only the one that actually decoded to non-zero dimensions.
function isDecoded(image: HTMLImageElement) {
  return image.complete && image.naturalWidth > 0;
}

function load(nextSrc: string | undefined) {
  detachCurrent();
  if (!nextSrc) {
    setStatus('error');
    return;
  }
  if (globalThis.window === undefined) {
    setStatus('loading');
    return;
  }
  const img = new globalThis.Image();
  currentImage = img;
  // Mirror the rendered element's fetch configuration onto the preload so the
  // displayed `<img>` reuses this cache entry instead of issuing a new request.
  if (referrerPolicy !== undefined) img.referrerPolicy = referrerPolicy;
  if (typeof crossOrigin === 'string') img.crossOrigin = crossOrigin;
  img.onload = () => {
    if (currentImage === img) setStatus(isDecoded(img) ? 'loaded' : 'error');
  };
  img.onerror = () => {
    if (currentImage === img) setStatus('error');
  };
  img.src = nextSrc;
  // Synchronously surface a browser-cached image to avoid a fallback flash.
  if (isDecoded(img)) {
    setStatus('loaded');
    return;
  }
  setStatus('loading');
}

watch(() => src, load, { immediate: true });

onBeforeUnmount(detachCurrent);

const shouldRender = computed(() => status.value === 'loaded');
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    v-if="shouldRender"
    role="img"
    :src="src"
    :alt="alt"
    :referrerpolicy="referrerPolicy"
    :crossorigin="crossOrigin"
  >
    <slot />
  </Primitive>
</template>
