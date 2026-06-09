<script setup lang="ts">
import { AspectRatio } from '@robonen/primitives';
import { ref } from 'vue';

const ratios = [
  { label: '16 / 9', value: 16 / 9 },
  { label: '4 / 3', value: 4 / 3 },
  { label: '1 / 1', value: 1 },
] as const;

const ratio = ref(ratios[0].value);
</script>

<template>
  <div class="flex flex-col gap-4 w-full max-w-md text-(--fg)">
    <div class="flex items-center gap-1 p-1 rounded-lg bg-(--bg-inset) border border-(--border) w-fit">
      <button
        v-for="r in ratios"
        :key="r.label"
        type="button"
        class="px-3 py-1 text-sm rounded-md transition-colors"
        :class="ratio === r.value
          ? 'bg-(--accent) text-(--accent-fg)'
          : 'text-(--fg-muted) hover:text-(--fg) hover:bg-(--bg-subtle)'"
        @click="ratio = r.value"
      >
        {{ r.label }}
      </button>
    </div>

    <AspectRatio
      :ratio="ratio"
      class="overflow-hidden rounded-xl border border-(--border) bg-(--bg-subtle)"
    >
      <img
        src="https://images.unsplash.com/photo-1535025183041-0991a977e25b?w=800&q=80"
        alt="Mountain landscape at dusk"
        class="h-full w-full object-cover"
      >
    </AspectRatio>

    <p class="text-sm text-(--fg-muted)">
      The frame keeps a fixed
      <span class="font-medium text-(--fg)">{{ ratios.find((r) => r.value === ratio)?.label }}</span>
      proportion as the container resizes, so the image never shifts surrounding layout.
    </p>
  </div>
</template>
