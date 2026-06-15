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
  <div class="demo-stack max-w-md">
    <div class="flex flex-col gap-1.5">
      <label class="demo-label">
        Auto-growing textarea
      </label>
      <textarea
        ref="textarea"
        v-model="input"
        placeholder="Start typing…"
        rows="1"
        class="demo-input resize-none overflow-y-auto leading-relaxed"
      />
    </div>

    <div class="demo-card flex flex-col gap-2 p-4">
      <div class="flex items-center justify-between">
        <span class="demo-label">
          Max height
        </span>
        <span class="font-mono text-sm tabular-nums text-fg">{{ maxHeight }}px</span>
      </div>
      <input
        v-model.number="maxHeight"
        type="range"
        min="80"
        max="400"
        step="20"
        class="w-full accent-accent"
      >
      <div class="flex items-center justify-between border-t border-border pt-2 text-xs">
        <span class="text-fg-muted">{{ input.length }} chars</span>
        <span class="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-inset px-2 py-0.5 font-medium text-fg-muted">
          {{ resizes }} resizes
        </span>
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="demo-btn-primary"
        @click="loadSample"
      >
        Load sample
      </button>
      <button
        type="button"
        class="demo-btn"
        @click="triggerResize"
      >
        Trigger resize
      </button>
      <button
        type="button"
        class="demo-btn disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="!input"
        @click="clear"
      >
        Clear
      </button>
    </div>
  </div>
</template>
