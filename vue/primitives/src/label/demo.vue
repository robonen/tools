<script setup lang="ts">
import { Label } from '@robonen/primitives';
import { ref } from 'vue';

const email = ref('');
const notify = ref(true);
</script>

<template>
  <form
    class="flex w-full max-w-sm flex-col gap-5 rounded-xl border border-(--border) bg-(--bg-elevated) p-5 text-(--fg)"
    @submit.prevent
  >
    <div class="flex flex-col gap-1.5">
      <Label
        for="demo-email"
        class="text-sm font-medium select-none"
      >
        Email address
      </Label>
      <input
        id="demo-email"
        v-model="email"
        type="email"
        placeholder="you@example.com"
        class="rounded-md border border-(--border) bg-(--bg-inset) px-3 py-2 text-sm outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--ring)"
      >
      <p class="text-xs text-(--fg-subtle)">
        Click the label above to focus the field.
      </p>
    </div>

    <Label
      for="demo-notify"
      class="flex cursor-pointer items-center gap-2.5 text-sm select-none"
    >
      <input
        id="demo-notify"
        v-model="notify"
        type="checkbox"
        class="size-4 accent-(--accent)"
      >
      Email me about product updates
    </Label>

    <p
      class="text-sm"
      :class="notify
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-(--fg-muted)'"
    >
      {{ notify ? 'You will receive updates.' : 'Updates are off.' }}
    </p>
  </form>
</template>
