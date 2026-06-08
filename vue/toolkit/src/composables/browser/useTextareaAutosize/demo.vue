<script setup lang="ts">
import { ref } from 'vue';
import { useTextareaAutosize } from './index';

const maxHeight = ref(220);
const resizes = ref(0);

const { textarea, input, triggerResize } = useTextareaAutosize({
  maxHeight,
  onResize: () => resizes.value++,
});

input.value = 'Type here and watch the textarea grow with your content.\n\nIt re-fits on every keystroke, on programmatic changes, and when the available width changes (try resizing the panel).';

function loadSample(): void {
  input.value = [
    'Release notes — v0.0.15',
    '',
    '- useTextareaAutosize now reacts to width reflow',
    '- Title sync is SSR-safe',
    '- URL params decode repeated keys to arrays',
  ].join('\n');
}

function clear(): void {
  input.value = '';
}
</script>

<template>
  <div class="flex w-full max-w-md flex-col gap-4">
    <div class="flex flex-col gap-1.5">
      <label class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Auto-growing textarea
      </label>
      <textarea
        ref="textarea"
        v-model="input"
        placeholder="Start typing…"
        rows="1"
        class="w-full resize-none overflow-y-auto rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm leading-relaxed text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
      />
    </div>

    <div class="flex flex-col gap-2 rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
          Max height
        </span>
        <span class="font-mono text-sm tabular-nums text-(--fg)">{{ maxHeight }}px</span>
      </div>
      <input
        v-model.number="maxHeight"
        type="range"
        min="80"
        max="400"
        step="20"
        class="w-full accent-(--accent)"
      >
      <div class="flex items-center justify-between border-t border-(--border) pt-2 text-xs">
        <span class="text-(--fg-muted)">{{ input.length }} chars</span>
        <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 font-medium text-(--fg-muted)">
          {{ resizes }} resizes
        </span>
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
        @click="loadSample"
      >
        Load sample
      </button>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
        @click="triggerResize"
      >
        Trigger resize
      </button>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="!input"
        @click="clear"
      >
        Clear
      </button>
    </div>
  </div>
</template>
