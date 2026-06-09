<script setup lang="ts">
import { Switch } from '@robonen/primitives';
import { ref } from 'vue';

const wifi = ref(true);
const notifications = ref(false);

// Generic value pair: this switch toggles between two strings, not booleans.
const theme = ref<'dark' | 'light'>('light');
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-1 rounded-xl border border-(--border) bg-(--bg-elevated) p-5 text-(--fg)">
    <h3 class="mb-2 text-sm font-semibold text-(--fg)">
      Settings
    </h3>

    <label
      for="demo-wifi"
      class="flex cursor-pointer items-center justify-between gap-4 rounded-lg px-1 py-2.5 select-none"
    >
      <span class="flex flex-col">
        <span class="text-sm font-medium">Wi-Fi</span>
        <span class="text-xs text-(--fg-subtle)">Connect to available networks</span>
      </span>
      <Switch
        id="demo-wifi"
        v-model="wifi"
        class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-0 bg-(--bg-inset) p-0.5 outline-none transition-colors data-[state=checked]:bg-(--accent) focus-visible:ring-2 focus-visible:ring-(--ring)"
      >
        <span
          class="pointer-events-none block size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out"
          :class="wifi ? 'translate-x-5' : 'translate-x-0'"
        />
      </Switch>
    </label>

    <label
      for="demo-notify"
      class="flex cursor-pointer items-center justify-between gap-4 rounded-lg px-1 py-2.5 select-none"
    >
      <span class="flex flex-col">
        <span class="text-sm font-medium">Notifications</span>
        <span class="text-xs text-(--fg-subtle)">Push alerts to this device</span>
      </span>
      <Switch
        id="demo-notify"
        v-model="notifications"
        class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-0 bg-(--bg-inset) p-0.5 outline-none transition-colors data-[state=checked]:bg-(--accent) focus-visible:ring-2 focus-visible:ring-(--ring)"
      >
        <span
          class="pointer-events-none block size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out"
          :class="notifications ? 'translate-x-5' : 'translate-x-0'"
        />
      </Switch>
    </label>

    <div class="flex items-center justify-between gap-4 border-t border-(--border) px-1 pt-3 mt-1">
      <span class="flex flex-col">
        <span class="text-sm font-medium">Appearance</span>
        <span class="text-xs text-(--fg-subtle)">Toggles between two string values</span>
      </span>
      <Switch
        v-model="theme"
        truthy="dark"
        falsy="light"
        aria-label="Theme"
        class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-0 bg-(--bg-inset) p-0.5 outline-none transition-colors data-[state=checked]:bg-(--fg) focus-visible:ring-2 focus-visible:ring-(--ring)"
      >
        <template #default="{ value }">
          <span
            class="pointer-events-none flex size-5 items-center justify-center rounded-full bg-white text-[10px] shadow-sm transition-transform duration-200 ease-out"
            :class="value === 'dark' ? 'translate-x-5' : 'translate-x-0'"
          >
            {{ value === 'dark' ? '🌙' : '☀️' }}
          </span>
        </template>
      </Switch>
    </div>

    <p class="mt-3 rounded-lg bg-(--bg-subtle) px-3 py-2 text-xs text-(--fg-muted)">
      Wi-Fi is
      <span :class="wifi ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">{{ wifi ? 'on' : 'off' }}</span>,
      notifications are
      <span :class="notifications ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">{{ notifications ? 'on' : 'off' }}</span>,
      theme is <span class="text-(--fg)">{{ theme }}</span>.
    </p>
  </div>
</template>
