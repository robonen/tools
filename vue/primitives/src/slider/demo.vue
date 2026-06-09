<script setup lang="ts">
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from '@robonen/primitives';
import { ref } from 'vue';

const volume = ref([60]);
const price = ref([20, 80]);
</script>

<template>
  <div class="w-full max-w-sm space-y-8 rounded-xl border border-(--border) bg-(--bg-elevated) p-6 text-(--fg)">
    <!-- Single value -->
    <div class="space-y-3">
      <div class="flex items-baseline justify-between text-sm">
        <span class="font-medium">Volume</span>
        <span class="font-mono text-(--fg-muted)">{{ volume[0] }}%</span>
      </div>

      <SliderRoot
        v-model="volume"
        :min="0"
        :max="100"
        :step="1"
        class="relative flex h-5 w-full touch-none select-none items-center"
      >
        <SliderTrack class="relative h-1.5 w-full grow rounded-full bg-(--bg-inset)">
          <SliderRange class="absolute h-full rounded-full bg-(--accent)" />
        </SliderTrack>
        <SliderThumb
          aria-label="Volume"
          class="absolute block h-4 w-4 -translate-x-1/2 rounded-full border-2 border-(--accent) bg-(--bg) shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-(--ring) hover:scale-110"
        />
      </SliderRoot>
    </div>

    <!-- Range (two thumbs) -->
    <div class="space-y-3">
      <div class="flex items-baseline justify-between text-sm">
        <span class="font-medium">Price range</span>
        <span class="font-mono text-(--fg-muted)">${{ price[0] }} – ${{ price[1] }}</span>
      </div>

      <SliderRoot
        v-model="price"
        :min="0"
        :max="100"
        :step="5"
        :min-steps-between-thumbs="1"
        class="relative flex h-5 w-full touch-none select-none items-center"
      >
        <SliderTrack class="relative h-1.5 w-full grow rounded-full bg-(--bg-inset)">
          <SliderRange class="absolute h-full rounded-full bg-(--accent)" />
        </SliderTrack>
        <SliderThumb
          aria-label="Minimum price"
          class="absolute block h-4 w-4 -translate-x-1/2 rounded-full border-2 border-(--accent) bg-(--bg) shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-(--ring) hover:scale-110"
        />
        <SliderThumb
          aria-label="Maximum price"
          class="absolute block h-4 w-4 -translate-x-1/2 rounded-full border-2 border-(--accent) bg-(--bg) shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-(--ring) hover:scale-110"
        />
      </SliderRoot>
    </div>

    <!-- Disabled -->
    <div class="space-y-3">
      <span class="text-sm font-medium text-(--fg-muted)">Disabled</span>

      <SliderRoot
        :default-value="40"
        disabled
        class="relative flex h-5 w-full touch-none select-none items-center opacity-50"
      >
        <SliderTrack class="relative h-1.5 w-full grow rounded-full bg-(--bg-inset)">
          <SliderRange class="absolute h-full rounded-full bg-(--fg-subtle)" />
        </SliderTrack>
        <SliderThumb
          aria-label="Disabled value"
          class="absolute block h-4 w-4 -translate-x-1/2 rounded-full border-2 border-(--fg-subtle) bg-(--bg)"
        />
      </SliderRoot>
    </div>
  </div>
</template>
