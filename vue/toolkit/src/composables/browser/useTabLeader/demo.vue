<script setup lang="ts">import { useTabLeader } from './index';

const { isLeader, isSupported, acquire, release } = useTabLeader('docs-demo-leader');
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-3">
      <span class="text-sm font-medium text-(--color-text-soft)">Web Locks API:</span>
      <span
        class="inline-flex items-center gap-1.5 text-sm font-mono px-2 py-0.5 rounded border"
        :class="isSupported ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700' : 'border-red-500/30 bg-red-500/10 text-red-700'"
      >
        {{ isSupported ? 'Supported' : 'Not supported' }}
      </span>
    </div>

    <div class="flex items-center gap-3">
      <span class="text-sm font-medium text-(--color-text-soft)">Leader status:</span>
      <span
        class="inline-flex items-center gap-1.5 text-sm font-mono px-2 py-0.5 rounded border"
        :class="isLeader ? 'border-brand-500/30 bg-brand-500/10 text-brand-600' : 'border-(--color-border) bg-(--color-bg-mute) text-(--color-text-soft)'"
      >
        <span
          class="w-2 h-2 rounded-full"
          :class="isLeader ? 'bg-brand-500 animate-pulse' : 'bg-(--color-text-mute)'"
        />
        {{ isLeader ? 'Leader' : 'Follower' }}
      </span>
    </div>

    <p class="text-xs text-(--color-text-mute)">
      Open this page in multiple tabs — only one will be the leader.
      Close the leader tab and another will take over automatically.
    </p>

    <div class="flex items-center gap-2 pt-2">
      <button
        class="px-3 py-1.5 text-sm rounded-md border border-(--color-border) bg-(--color-bg) hover:bg-(--color-bg-mute) text-(--color-text-soft) transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="!isSupported || isLeader"
        @click="acquire"
      >
        Acquire
      </button>
      <button
        class="px-3 py-1.5 text-sm rounded-md border border-(--color-border) bg-(--color-bg) hover:bg-(--color-bg-mute) text-(--color-text-soft) transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="!isSupported || !isLeader"
        @click="release"
      >
        Release
      </button>
    </div>
  </div>
</template>
