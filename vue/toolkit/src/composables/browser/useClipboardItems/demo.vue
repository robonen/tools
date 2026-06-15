<script setup lang="ts">
import { ref } from 'vue';
import { useClipboardItems } from './index';

const errorMessage = ref('');

const { content, copied, copyPending, isSupported, copy, read } = useClipboardItems({
  onError: (error) => {
    errorMessage.value = error instanceof Error ? error.message : String(error);
  },
});

const plain = 'Ada Lovelace — first computer programmer';
const html = '<strong>Ada Lovelace</strong> — <em>first computer programmer</em>';

function copyRich(): void {
  errorMessage.value = '';
  copy([
    new ClipboardItem({
      'text/plain': new Blob([plain], { type: 'text/plain' }),
      'text/html': new Blob([html], { type: 'text/html' }),
    }),
  ]);
}

async function readClipboard(): Promise<void> {
  errorMessage.value = '';
  await read();
}

function typesOf(item: ClipboardItem): string {
  return item.types.join(', ');
}
</script>

<template>
  <div class="demo-stack max-w-sm">
    <div class="flex items-center justify-between">
      <span class="demo-label">ClipboardItem API</span>
      <span
        class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium"
        :class="isSupported
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'"
      >
        {{ isSupported ? 'Supported' : 'Not supported' }}
      </span>
    </div>

    <template v-if="isSupported">
      <div class="demo-card p-4">
        <span class="demo-label">Rich payload</span>
        <p class="mt-1 text-sm text-fg" v-html="html" />
        <p class="mt-1 font-mono text-xs text-fg-subtle">text/plain &middot; text/html</p>
      </div>

      <div class="flex gap-2">
        <button
          class="demo-btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          :disabled="copyPending"
          @click="copyRich"
        >
          {{ copyPending ? 'Copying…' : copied ? 'Copied!' : 'Copy rich content' }}
        </button>
        <button
          class="demo-btn"
          @click="readClipboard"
        >
          Read clipboard
        </button>
      </div>

      <div class="rounded-lg border border-border bg-bg-inset p-3">
        <span class="demo-label">
          content ({{ content.length }} {{ content.length === 1 ? 'item' : 'items' }})
        </span>
        <ul v-if="content.length" class="mt-2 flex flex-col gap-1">
          <li
            v-for="(item, i) in content"
            :key="i"
            class="font-mono text-xs text-fg"
          >
            #{{ i + 1 }}: {{ typesOf(item) }}
          </li>
        </ul>
        <p v-else class="mt-2 font-mono text-xs text-fg-subtle">No items read yet</p>
      </div>

      <div
        v-if="errorMessage"
        class="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400"
      >
        {{ errorMessage }}
      </div>
    </template>

    <div
      v-else
      class="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400"
    >
      The async ClipboardItem API is not available in this browser.
    </div>
  </div>
</template>
