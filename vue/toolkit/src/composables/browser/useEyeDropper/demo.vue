<script setup lang="ts">
import { computed, ref } from 'vue';
import { useEyeDropper } from './index';

const { isSupported, sRGBHex, open } = useEyeDropper({ initialValue: '#6366f1' });

const history = ref<string[]>([]);
const error = ref('');

const hex = computed(() => sRGBHex.value || '#000000');

function relativeLuminance(color: string): number {
  const value = color.replace('#', '');
  const r = Number.parseInt(value.slice(0, 2), 16) / 255;
  const g = Number.parseInt(value.slice(2, 4), 16) / 255;
  const b = Number.parseInt(value.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

const readableText = computed(() => (relativeLuminance(hex.value) > 0.5 ? '#000000' : '#ffffff'));

async function pick() {
  error.value = '';
  try {
    const result = await open();
    if (result && !history.value.includes(result.sRGBHex))
      history.value = [result.sRGBHex, ...history.value].slice(0, 6);
  }
  catch {
    error.value = 'Selection cancelled';
  }
}
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div
      v-if="!isSupported"
      class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center text-sm text-amber-600 dark:text-amber-400"
    >
      The EyeDropper API is not supported in this browser.
    </div>

    <template v-else>
      <div
        class="flex h-32 items-center justify-center rounded-xl border border-(--border) transition-colors duration-300"
        :style="{ backgroundColor: hex, color: readableText }"
      >
        <span class="font-mono text-2xl font-bold tabular-nums">{{ hex }}</span>
      </div>

      <button class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer" @click="pick">
        <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m2 22 1-1h3l9-9" /><path d="M3 21v-3l9-9" /><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L21 6l3 3-3 3-3-3-9 9" />
        </svg>
        Pick a color from screen
      </button>

      <p v-if="error" class="text-center text-xs text-(--fg-subtle)">
        {{ error }}
      </p>

      <div v-if="history.length" class="flex flex-col gap-2">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Recent</span>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="color in history"
            :key="color"
            class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted) transition hover:border-(--border-strong) cursor-pointer"
            @click="sRGBHex = color"
          >
            <span class="size-3 rounded-full border border-(--border)" :style="{ backgroundColor: color }" />
            {{ color }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
