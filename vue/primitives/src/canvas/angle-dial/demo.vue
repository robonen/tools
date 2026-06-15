<script setup lang="ts">
import { AngleDialRoot, AngleDialThumb } from '@robonen/primitives';
import { ref } from 'vue';

const angle = ref(45);
</script>

<template>
  <div class="demo-card flex w-full max-w-sm flex-col items-center gap-6 p-6 text-fg">
    <div class="flex w-full items-baseline justify-between text-sm">
      <span class="font-medium">Rotation</span>
      <span class="font-mono text-fg-muted">{{ Math.round(angle) }}°</span>
    </div>

    <!-- The dial: a round track with the thumb on the ring (the box edge), angle
         in the center. The thumb auto-positions at radius 0.5 of the box, so its
         center lands exactly on the root's border ring. -->
    <AngleDialRoot
      v-model:value="angle"
      :snap="15"
      class="relative size-44 touch-none select-none rounded-full border-2 border-border-strong bg-bg-inset shadow-(--shadow-card)"
    >
      <!-- tick at 0° (top edge) -->
      <div class="pointer-events-none absolute left-1/2 top-2 h-2.5 w-0.5 -translate-x-1/2 rounded-full bg-fg-subtle" />

      <!-- center readout -->
      <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span class="font-mono text-2xl font-semibold tabular-nums text-fg">{{ Math.round(angle) }}°</span>
        <span class="text-xs text-fg-subtle">drag the dial</span>
      </div>

      <AngleDialThumb
        aria-label="Rotation angle"
        class="absolute z-10 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-bg shadow-md outline-none transition-[transform] focus-visible:ring-2 focus-visible:ring-ring hover:scale-110"
      />
    </AngleDialRoot>

    <!-- a small element rotated by the live angle -->
    <div class="flex items-center gap-3 text-sm text-fg-muted">
      <span>preview</span>
      <span
        class="grid size-12 place-items-center rounded-card border border-border-strong bg-accent text-accent-text shadow-sm transition-transform duration-75"
        :style="{ transform: `rotate(${angle}deg)` }"
      >
        <span class="text-lg leading-none">↑</span>
      </span>
    </div>
  </div>
</template>
