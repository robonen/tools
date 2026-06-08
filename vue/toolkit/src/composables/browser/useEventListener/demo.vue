<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import { useEventListener } from './index';

// 1. Element target via template ref — track pointer position over the pad.
const pad = ref<HTMLElement>();
const pos = ref({ x: 0, y: 0 });
const inside = ref(false);

useEventListener(pad, 'pointermove', (e: PointerEvent) => {
  const rect = pad.value?.getBoundingClientRect();
  if (!rect)
    return;
  pos.value = {
    x: Math.round(e.clientX - rect.left),
    y: Math.round(e.clientY - rect.top),
  };
});
useEventListener(pad, 'pointerenter', () => (inside.value = true));
useEventListener(pad, 'pointerleave', () => (inside.value = false));

// 2. Global window target with a stoppable listener — capture last key.
const lastKey = shallowRef<string>('');
const keyCount = ref(0);
const listening = ref(true);

const stop = useEventListener('keydown', (e: KeyboardEvent) => {
  lastKey.value = e.key === ' ' ? 'Space' : e.key;
  keyCount.value += 1;
});

function toggleListening() {
  if (listening.value) {
    stop();
    listening.value = false;
  }
  else {
    // Re-arm by registering a fresh listener.
    useEventListener('keydown', (e: KeyboardEvent) => {
      lastKey.value = e.key === ' ' ? 'Space' : e.key;
      keyCount.value += 1;
    });
    listening.value = true;
  }
}
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="flex flex-col gap-2">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">pointermove on element</span>
      <div
        ref="pad"
        class="relative h-32 overflow-hidden rounded-xl border border-(--border) bg-(--bg-inset) touch-none"
      >
        <div
          class="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--accent) transition-opacity"
          :class="inside ? 'opacity-100' : 'opacity-0'"
          :style="{ left: `${pos.x}px`, top: `${pos.y}px` }"
        />
        <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span class="text-xs text-(--fg-subtle)">{{ inside ? '' : 'Hover here' }}</span>
        </div>
        <div class="pointer-events-none absolute bottom-2 left-2 rounded-md border border-(--border) bg-(--bg) px-2 py-0.5 font-mono text-xs tabular-nums text-(--fg-muted)">
          x: {{ pos.x }} · y: {{ pos.y }}
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-2 rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">keydown on window</span>
        <button
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-xs font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="toggleListening"
        >
          {{ listening ? 'Stop listening' : 'Start listening' }}
        </button>
      </div>

      <div class="flex items-center gap-3">
        <kbd
          class="flex min-w-[3.5rem] items-center justify-center rounded-lg border border-(--border-strong) bg-(--bg-inset) px-3 py-2 font-mono text-sm font-medium text-(--fg)"
        >
          {{ lastKey || '—' }}
        </kbd>
        <div class="flex flex-col">
          <span class="text-xs text-(--fg-subtle)">presses captured</span>
          <span class="font-mono text-lg font-bold tabular-nums text-(--fg)">{{ keyCount }}</span>
        </div>
        <span
          class="ml-auto inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium"
          :class="listening
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'border-(--border) bg-(--bg-inset) text-(--fg-muted)'"
        >
          <span
            class="h-1.5 w-1.5 rounded-full"
            :class="listening ? 'bg-emerald-500 animate-pulse' : 'bg-(--fg-subtle)'"
          />
          {{ listening ? 'active' : 'stopped' }}
        </span>
      </div>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      Listeners auto-detach on unmount. The returned stop function lets you detach early — press any key, then toggle listening.
    </p>
  </div>
</template>
