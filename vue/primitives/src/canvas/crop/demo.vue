<script setup lang="ts">
import {
  CROP_HANDLE_POSITIONS,
  CropArea,
  CropGrid,
  CropHandle,
  CropOverlay,
  CropRoot,
} from '@robonen/primitives';
import type { CropRect } from '@robonen/primitives';
import { ref } from 'vue';

// Normalized rect: x / y / width / height are fractions 0..1 of the photo.
const crop = ref<CropRect>({ x: 0.18, y: 0.16, width: 0.5, height: 0.5 });

// Aspect-ratio lock variants (width / height of the visual box). null = free.
const ratios = [
  { label: 'Free', value: null },
  { label: '1:1', value: 1 },
  { label: '16:9', value: 16 / 9 },
  { label: '4:5', value: 4 / 5 },
] as const;
const ratio = ref<number | null>(null);

const pct = (n: number) => Math.round(n * 100);
</script>

<template>
  <div class="demo-card w-full max-w-xl space-y-4 p-6 text-fg">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold">Crop</h3>
        <p class="text-xs text-fg-muted">Drag the region to move, the squares to resize. Rule-of-thirds grid + dimmed surround.</p>
      </div>

      <!-- Aspect-ratio variant switch -->
      <div class="flex items-center gap-1 rounded-lg border border-border bg-bg-inset p-0.5">
        <button
          v-for="opt in ratios"
          :key="opt.label"
          type="button"
          class="rounded-md px-2 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          :class="ratio === opt.value ? 'bg-accent text-accent-fg shadow-sm' : 'text-fg-muted hover:text-fg'"
          @click="ratio = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- The photo: CropRoot is the media-sized, positioned surface laid over it. -->
    <CropRoot
      v-model="crop"
      :aspect-ratio="ratio"
      :media-width="640"
      :media-height="420"
      :min-width="0.1"
      :min-height="0.1"
      class="relative aspect-[640/420] w-full select-none overflow-hidden rounded-card border border-border outline-none"
      style="background: linear-gradient(115deg, oklch(0.7 0.16 200) 0%, oklch(0.66 0.2 285) 45%, oklch(0.74 0.18 25) 100%);"
    >
      <!-- Decorative 'subject' so the crop has something to frame. -->
      <div
        class="pointer-events-none absolute left-[42%] top-[34%] h-28 w-28 rounded-full opacity-90 blur-[2px]"
        style="background: radial-gradient(circle at 35% 30%, oklch(0.96 0.05 95) 0%, oklch(0.82 0.16 80) 55%, transparent 72%);"
      />

      <!-- Dimmed scrim over everything OUTSIDE the crop rect (four sibling rects). -->
      <CropOverlay>
        <template #default="{ rects }">
          <span
            v-for="rect in rects"
            :key="rect.key"
            :style="rect.style"
            class="bg-black/55 backdrop-saturate-50"
          />
        </template>
      </CropOverlay>

      <!-- The crop rectangle: draggable body + handles + grid. -->
      <CropArea class="absolute cursor-move outline-none ring-1 ring-bg/30 focus-visible:ring-2 focus-visible:ring-ring">
        <!-- Selection border -->
        <span class="pointer-events-none absolute inset-0 border border-bg/90 shadow-[0_0_0_1px_oklch(0_0_0/0.25)]" />

        <!-- Rule-of-thirds grid lines -->
        <CropGrid>
          <template #default="{ lines }">
            <span
              v-for="(p, i) in lines"
              :key="`v-${i}`"
              class="absolute bottom-0 top-0 w-px bg-bg/50"
              :style="{ left: `${p}%` }"
            />
            <span
              v-for="(p, i) in lines"
              :key="`h-${i}`"
              class="absolute left-0 right-0 h-px bg-bg/50"
              :style="{ top: `${p}%` }"
            />
          </template>
        </CropGrid>

        <!-- Eight resize handles as small accent squares on the corners + edges. -->
        <CropHandle
          v-for="pos in CROP_HANDLE_POSITIONS"
          :key="pos"
          :position="pos"
          class="block h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-[2px] border border-bg bg-accent shadow-sm outline-none transition hover:scale-125 focus-visible:ring-2 focus-visible:ring-ring"
          :class="pos === 'left' || pos === 'right' ? 'cursor-ew-resize' : pos === 'top' || pos === 'bottom' ? 'cursor-ns-resize' : pos === 'top-left' || pos === 'bottom-right' ? 'cursor-nwse-resize' : 'cursor-nesw-resize'"
        />
      </CropArea>
    </CropRoot>

    <!-- Normalized crop rect readout. -->
    <dl class="grid grid-cols-4 gap-2 text-center">
      <div v-for="item in [
        { label: 'X', value: `${pct(crop.x)}%` },
        { label: 'Y', value: `${pct(crop.y)}%` },
        { label: 'W', value: `${pct(crop.width)}%` },
        { label: 'H', value: `${pct(crop.height)}%` },
      ]" :key="item.label" class="rounded-md border border-border bg-bg-inset py-1.5">
        <dt class="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">{{ item.label }}</dt>
        <dd class="font-mono text-sm text-fg">{{ item.value }}</dd>
      </div>
    </dl>

    <p class="text-xs text-fg-subtle">
      Values are normalized fractions of the photo. Focus the region or a handle and use arrow keys
      (<kbd class="rounded border border-border bg-bg px-1 font-mono">Shift</kbd> for larger steps).
    </p>
  </div>
</template>
