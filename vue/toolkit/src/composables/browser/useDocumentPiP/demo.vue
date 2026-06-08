<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useDocumentPiP } from './index';

const { isSupported, isOpen, error, open, close } = useDocumentPiP();

// A live element we move into (and back out of) the PiP window.
const player = ref<HTMLElement>();
const host = ref<HTMLElement>();
const elapsed = ref(0);

let timer: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  timer = setInterval(() => {
    elapsed.value += 1;
  }, 1000);
});

onUnmounted(() => {
  if (timer)
    clearInterval(timer);
});

async function popOut() {
  const win = await open({ width: 320, height: 180 });

  if (win && player.value) {
    // Carry over the document styles so the moved DOM keeps its look.
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const css = Array.from(sheet.cssRules).map(r => r.cssText).join('');
        const style = win.document.createElement('style');
        style.textContent = css;
        win.document.head.append(style);
      }
      catch {
        // Cross-origin stylesheet — skip.
      }
    }
    win.document.body.style.margin = '0';
    win.document.body.append(player.value);
  }
}

// When the PiP window closes, pull the element back into the page.
watch(isOpen, (openNow) => {
  if (!openNow && player.value && host.value)
    host.value.append(player.value);
});
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div
      v-if="!isSupported"
      class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400"
    >
      Document Picture-in-Picture is not supported in this browser.
    </div>

    <template v-else>
      <div
        ref="host"
        class="min-h-[7rem] rounded-xl border border-(--border) bg-(--bg-inset) p-1"
      >
        <div
          ref="player"
          class="flex h-full flex-col items-center justify-center gap-1 rounded-lg bg-(--bg-elevated) p-6"
        >
          <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Live timer</span>
          <span class="font-mono text-3xl font-bold tabular-nums text-(--fg)">
            {{ String(Math.floor(elapsed / 60)).padStart(2, '0') }}:{{ String(elapsed % 60).padStart(2, '0') }}
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          :disabled="isOpen"
          @click="popOut"
        >
          Pop out
        </button>
        <button
          type="button"
          class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          :disabled="!isOpen"
          @click="close"
        >
          Close window
        </button>
      </div>

      <div class="flex items-center justify-between rounded-lg border border-(--border) bg-(--bg-inset) p-3 text-sm">
        <span class="text-(--fg-muted)">isOpen</span>
        <span
          class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium"
          :class="isOpen
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'border-(--border) bg-(--bg) text-(--fg-muted)'"
        >
          <span
            class="h-1.5 w-1.5 rounded-full"
            :class="isOpen ? 'bg-emerald-500' : 'bg-(--fg-subtle)'"
          />
          {{ isOpen ? 'floating' : 'docked' }}
        </span>
      </div>

      <p
        v-if="error"
        class="text-xs text-red-600 dark:text-red-400"
      >
        {{ String(error) }}
      </p>
      <p
        v-else
        class="text-xs text-(--fg-subtle)"
      >
        "Pop out" moves the live timer into an always-on-top window. Closing it returns the element to the page.
      </p>
    </template>
  </div>
</template>
