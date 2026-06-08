<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { useFocusWithin } from './index';

const form = useTemplateRef<HTMLFormElement>('form');
const { focused } = useFocusWithin(form);
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-3">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Shipping address
      </span>
      <span
        class="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium transition"
        :class="focused
          ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
          : 'border border-(--border) bg-(--bg-inset) text-(--fg-muted)'"
      >
        <span
          class="size-1.5 rounded-full transition"
          :class="focused ? 'bg-sky-500' : 'bg-(--fg-subtle)'"
        />
        {{ focused ? 'Editing' : 'Idle' }}
      </span>
    </div>

    <form
      ref="form"
      class="space-y-3 rounded-xl border bg-(--bg-elevated) p-4 transition"
      :class="focused ? 'border-(--accent) ring-2 ring-(--ring)' : 'border-(--border)'"
      @submit.prevent
    >
      <input
        type="text"
        placeholder="Full name"
        value="Grace Hopper"
        class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
      >
      <input
        type="text"
        placeholder="Street address"
        value="1701 Enterprise Ave"
        class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
      >
      <div class="flex gap-3">
        <input
          type="text"
          placeholder="City"
          value="Arlington"
          class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
        >
        <input
          type="text"
          placeholder="ZIP"
          value="22202"
          class="w-28 rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
        >
      </div>
    </form>

    <p class="text-xs text-(--fg-subtle)">
      The whole panel highlights while focus lives in <em>any</em> descendant field &mdash; tabbing between inputs stays "Editing".
    </p>
  </div>
</template>
