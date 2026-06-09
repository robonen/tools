<script setup lang="ts">
import { ref } from 'vue';
import {
  QrCodeBackground,
  QrCodeCells,
  QrCodeLogo,
  QrCodeMarker,
  QrCodeMarkers,
  QrCodeRoot,
} from '@robonen/primitives';
import type { QrCellPattern, QrMarkerBall, QrMarkerFrame } from '@robonen/primitives';

const value = ref('https://github.com/robonen/tools');

const pattern = ref<QrCellPattern>('fluid');
const frame = ref<QrMarkerFrame>('rounded');
const ball = ref<QrMarkerBall>('circle');

const patterns: QrCellPattern[] = ['square', 'dot', 'rounded', 'fluid'];
const frames: QrMarkerFrame[] = ['square', 'rounded', 'circle'];
const balls: QrMarkerBall[] = ['square', 'rounded', 'circle', 'diamond'];
</script>

<template>
  <div class="flex flex-col gap-6 text-(--fg)">
    <!-- Interactive playground -->
    <div class="flex flex-col items-center gap-5 rounded-xl border border-(--border) bg-(--bg-elevated) p-6 sm:flex-row sm:items-start">
      <QrCodeRoot
        :value="value"
        error-correction="H"
        class="size-48 shrink-0 text-(--fg)"
      >
        <QrCodeBackground fill="transparent" :radius="2" />
        <QrCodeCells :pattern="pattern" :radius="0.6" class="fill-current" />
        <QrCodeMarkers :frame="frame" :ball="ball" :radius="0.5" class="fill-(--accent)" />
        <QrCodeLogo v-slot="{ cx, cy, width }" :size="0.22" :padding="1.5">
          <circle :cx="cx" :cy="cy" :r="width / 2" class="fill-(--bg-elevated)" />
          <text
            :x="cx"
            :y="cy"
            text-anchor="middle"
            dominant-baseline="central"
            :font-size="width * 0.7"
            class="fill-(--accent)"
            style="font-family: ui-sans-serif, system-ui; font-weight: 700"
          >
            R
          </text>
        </QrCodeLogo>
      </QrCodeRoot>

      <div class="flex w-full flex-col gap-3 text-sm">
        <label class="flex flex-col gap-1">
          <span class="text-(--fg-muted)">Value</span>
          <input
            v-model="value"
            class="rounded-md border border-(--border) bg-(--bg-inset) px-2 py-1"
          >
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-(--fg-muted)">Pattern</span>
          <select v-model="pattern" class="rounded-md border border-(--border) bg-(--bg-inset) px-2 py-1">
            <option v-for="p in patterns" :key="p" :value="p">{{ p }}</option>
          </select>
        </label>
        <div class="flex gap-3">
          <label class="flex flex-1 flex-col gap-1">
            <span class="text-(--fg-muted)">Frame</span>
            <select v-model="frame" class="rounded-md border border-(--border) bg-(--bg-inset) px-2 py-1">
              <option v-for="f in frames" :key="f" :value="f">{{ f }}</option>
            </select>
          </label>
          <label class="flex flex-1 flex-col gap-1">
            <span class="text-(--fg-muted)">Ball</span>
            <select v-model="ball" class="rounded-md border border-(--border) bg-(--bg-inset) px-2 py-1">
              <option v-for="b in balls" :key="b" :value="b">{{ b }}</option>
            </select>
          </label>
        </div>
      </div>
    </div>

    <!-- A few canned styles showing per-corner control and gradients -->
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <QrCodeRoot value="dots" class="size-32 text-emerald-500">
        <QrCodeCells pattern="dot" :gap="0.2" class="fill-current" />
        <QrCodeMarkers frame="circle" ball="circle" class="fill-current" />
      </QrCodeRoot>

      <QrCodeRoot value="fluid" class="size-32 text-indigo-500">
        <QrCodeCells pattern="fluid" :radius="1" class="fill-current" />
        <QrCodeMarkers frame="rounded" ball="rounded" :radius="0.6" class="fill-current" />
      </QrCodeRoot>

      <QrCodeRoot value="per-corner" class="size-32">
        <QrCodeCells pattern="rounded" :radius="0.4" class="fill-neutral-800 dark:fill-neutral-100" />
        <QrCodeMarker corner="top-left" frame="circle" ball="circle" class="fill-rose-500" />
        <QrCodeMarker corner="top-right" frame="rounded" ball="diamond" :radius="0.5" class="fill-amber-500" />
        <QrCodeMarker corner="bottom-left" frame="square" ball="square" class="fill-sky-500" />
      </QrCodeRoot>
    </div>
  </div>
</template>
