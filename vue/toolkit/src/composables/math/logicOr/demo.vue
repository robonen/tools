<script setup lang="ts">
import { ref } from 'vue';
import { logicOr } from './index';

const email = ref(true);
const sms = ref(false);
const push = ref(false);

const hasChannel = logicOr(email, sms, push);

const channels = [
  { key: 'email', label: 'Email', model: email },
  { key: 'sms', label: 'SMS', model: sms },
  { key: 'push', label: 'Push', model: push },
] as const;
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Notification channels</span>

    <div class="flex flex-col gap-2">
      <label
        v-for="ch in channels"
        :key="ch.key"
        class="flex cursor-pointer items-center justify-between rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-2.5 transition hover:border-(--border-strong)"
      >
        <span class="text-sm font-medium text-(--fg)">{{ ch.label }}</span>
        <input
          v-model="ch.model.value"
          type="checkbox"
          class="size-4 cursor-pointer accent-(--accent)"
        >
      </label>
    </div>

    <div
      class="flex items-center justify-between rounded-xl border p-4 transition"
      :class="hasChannel
        ? 'border-emerald-500/30 bg-emerald-500/10'
        : 'border-amber-500/30 bg-amber-500/10'"
    >
      <div class="flex flex-col">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">logicOr(email, sms, push)</span>
        <span
          class="text-sm font-medium"
          :class="hasChannel
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-amber-600 dark:text-amber-400'"
        >{{ hasChannel ? 'At least one channel is on' : 'Pick a channel to get notified' }}</span>
      </div>
      <span class="font-mono text-2xl font-bold tabular-nums text-(--fg)">{{ hasChannel }}</span>
    </div>
  </div>
</template>
