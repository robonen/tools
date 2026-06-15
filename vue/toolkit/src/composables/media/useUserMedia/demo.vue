<script setup lang="ts">
import { ref, shallowRef, useTemplateRef, watch } from 'vue';
import { useUserMedia } from './index';

const facingMode = ref<'user' | 'environment'>('user');
const lastError = shallowRef<string | undefined>();

const video = useTemplateRef<HTMLVideoElement>('video');

const {
  isSupported,
  stream,
  enabled,
  start,
  stop,
} = useUserMedia({
  constraints: () => ({ video: { facingMode: facingMode.value }, audio: false }),
  onError: (error) => {
    lastError.value = error instanceof Error ? error.message : String(error);
  },
});

// Attach the live stream to the <video> element whenever it changes.
watch([stream, video], ([currentStream, el]) => {
  if (el)
    el.srcObject = currentStream ?? null;
});

async function handleStart(): Promise<void> {
  lastError.value = undefined;
  await start();
}

function swapCamera(): void {
  facingMode.value = facingMode.value === 'user' ? 'environment' : 'user';
}
</script>

<template>
  <div class="demo-stack max-w-sm">
    <div
      v-if="!isSupported"
      class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400"
    >
      Camera capture (getUserMedia) is not supported in this browser.
    </div>

    <template v-else>
      <div class="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-bg-inset">
        <video
          ref="video"
          autoplay
          playsinline
          muted
          class="size-full object-cover"
          :class="{ 'opacity-0': !stream }"
        />
        <div
          v-if="!stream"
          class="absolute inset-0 flex flex-col items-center justify-center gap-1 text-fg-subtle"
        >
          <span class="text-sm font-medium">Camera off</span>
          <span class="text-xs">Press start to enable your webcam.</span>
        </div>
        <span
          v-if="stream"
          class="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur"
        >
          <span class="size-1.5 rounded-full bg-red-500 animate-pulse" />
          LIVE
        </span>
      </div>

      <div class="flex items-center gap-2">
        <button
          v-if="!enabled"
          type="button"
          class="demo-btn-primary flex-1"
          @click="handleStart"
        >
          Start camera
        </button>
        <button
          v-else
          type="button"
          class="demo-btn flex-1"
          @click="stop()"
        >
          Stop camera
        </button>
        <button
          type="button"
          class="demo-btn"
          @click="swapCamera"
        >
          Flip
        </button>
      </div>

      <div class="rounded-lg border border-border bg-bg-inset p-3 flex items-center justify-between">
        <span class="demo-label">Facing</span>
        <span class="font-mono text-sm tabular-nums text-fg">
          {{ facingMode === 'user' ? 'Front (user)' : 'Back (environment)' }}
        </span>
      </div>

      <p
        v-if="lastError"
        class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
      >
        {{ lastError }}
      </p>
    </template>
  </div>
</template>
