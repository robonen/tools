<script setup lang="ts">
import { useTabLeader } from './index';

const { isLeader, isSupported, acquire, release } = useTabLeader('vue-toolkit-demo-leader');
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Web Locks election
      </span>
      <span
        class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium"
        :class="isSupported
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-(--border) bg-(--bg-inset) text-(--fg-muted)'"
      >
        <span
          class="size-1.5 rounded-full"
          :class="isSupported ? 'bg-emerald-500' : 'bg-(--fg-subtle)'"
        />
        {{ isSupported ? 'Supported' : 'Unsupported' }}
      </span>
    </div>

    <!-- Primary leader state -->
    <div
      class="flex flex-col items-center gap-2 rounded-xl border p-6 transition-colors"
      :class="isLeader
        ? 'border-(--accent) bg-(--accent-subtle)'
        : 'border-(--border) bg-(--bg-elevated)'"
    >
      <div
        class="flex size-12 items-center justify-center rounded-full transition-colors"
        :class="isLeader
          ? 'bg-(--accent) text-(--accent-fg)'
          : 'bg-(--bg-inset) text-(--fg-subtle)'"
      >
        <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m12 2 3 7h7l-5.5 4.5L18.5 21 12 16.5 5.5 21 7.5 13.5 2 9h7z" />
        </svg>
      </div>
      <p
        class="text-lg font-bold"
        :class="isLeader ? 'text-(--accent-text)' : 'text-(--fg)'"
      >
        {{ isLeader ? 'Leader tab' : 'Follower tab' }}
      </p>
      <p class="text-center text-xs text-(--fg-muted)">
        {{ isLeader
          ? 'This tab holds the lock and would run exclusive work.'
          : 'Another tab is the leader, or leadership was released.' }}
      </p>
    </div>

    <div class="flex gap-2">
      <button
        type="button"
        :disabled="!isSupported || isLeader"
        class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        @click="acquire"
      >
        Acquire
      </button>
      <button
        type="button"
        :disabled="!isSupported || !isLeader"
        class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        @click="release"
      >
        Release
      </button>
    </div>

    <p v-if="!isSupported" class="text-xs leading-relaxed text-(--fg-subtle)">
      The Web Locks API is not available in this browser.
    </p>
    <p v-else class="text-xs leading-relaxed text-(--fg-subtle)">
      Open this page in a second tab — only one tab is the leader at a time. Release
      here and watch another tab take over.
    </p>
  </div>
</template>
