<script setup lang="ts">
import { useStyleTag } from './index';

const initialCss = `.styletag-demo-box {
  background: linear-gradient(135deg, #6366f1, #ec4899);
  color: white;
  letter-spacing: 0.05em;
}`;

const { id, css, isLoaded, load, unload } = useStyleTag(initialCss, { immediate: false });
</script>

<template>
  <div class="demo-stack max-w-sm">
    <div class="flex items-center justify-between">
      <span class="demo-label">
        Injected style tag
      </span>
      <span
        class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium"
        :class="isLoaded
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-border bg-bg-inset text-fg-muted'"
      >
        <span
          class="size-1.5 rounded-full"
          :class="isLoaded ? 'bg-emerald-500' : 'bg-fg-subtle'"
        />
        {{ isLoaded ? 'Loaded' : 'Unloaded' }}
      </span>
    </div>

    <!-- Live target affected by the injected stylesheet -->
    <div class="rounded-xl border border-border bg-bg-inset p-4">
      <div
        class="styletag-demo-box rounded-lg border border-border bg-bg-elevated px-4 py-6 text-center text-sm font-semibold text-fg transition-all"
      >
        Styled by &lt;style id="{{ id }}"&gt;
      </div>
    </div>

    <label class="flex flex-col gap-1.5">
      <span class="demo-label">CSS source</span>
      <textarea
        v-model="css"
        rows="5"
        spellcheck="false"
        class="w-full resize-none rounded-lg border border-border bg-bg px-3 py-2 font-mono text-xs leading-relaxed text-fg placeholder:text-fg-subtle transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </label>

    <div class="flex gap-2">
      <button
        type="button"
        :disabled="isLoaded"
        class="demo-btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        @click="load"
      >
        Load
      </button>
      <button
        type="button"
        :disabled="!isLoaded"
        class="demo-btn flex-1 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        @click="unload"
      >
        Unload
      </button>
    </div>

    <p class="text-xs leading-relaxed text-fg-subtle">
      Editing the CSS updates the live stylesheet instantly while loaded.
    </p>
  </div>
</template>
