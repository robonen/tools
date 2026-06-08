<script setup lang="ts">
import { computed } from 'vue';
import { useSessionStorage } from './index';

// sessionStorage survives reloads but is cleared when the tab closes —
// perfect for a multi-step draft that should not leak between sessions.
const step = useSessionStorage('demo:wizard-step', 1);

const draft = useSessionStorage('demo:wizard-draft', {
  name: '',
  email: '',
  newsletter: true,
});

const totalSteps = 3;

const progress = computed(() => Math.round((step.value / totalSteps) * 100));

function next() {
  if (step.value < totalSteps)
    step.value++;
}

function prev() {
  if (step.value > 1)
    step.value--;
}

function clearDraft() {
  step.value = 1;
  draft.value = { name: '', email: '', newsletter: true };
}
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Step {{ step }} of {{ totalSteps }}
      </span>
      <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
        sessionStorage
      </span>
    </div>

    <div class="h-1.5 w-full overflow-hidden rounded-full bg-(--bg-inset)">
      <div
        class="h-full rounded-full bg-(--accent) transition-all duration-300"
        :style="{ width: `${progress}%` }"
      />
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-4">
      <template v-if="step === 1">
        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Full name</span>
          <input
            v-model="draft.name"
            type="text"
            placeholder="Grace Hopper"
            class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
          >
        </label>
      </template>

      <template v-else-if="step === 2">
        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Email</span>
          <input
            v-model="draft.email"
            type="email"
            placeholder="grace@navy.mil"
            class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
          >
        </label>
      </template>

      <template v-else>
        <label class="flex items-center justify-between gap-3 cursor-pointer">
          <span class="text-sm text-(--fg)">Subscribe to the newsletter</span>
          <input v-model="draft.newsletter" type="checkbox" class="h-4 w-4 accent-(--accent)">
        </label>
        <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 text-sm text-(--fg-muted)">
          <p><span class="text-(--fg-subtle)">Name:</span> {{ draft.name || '—' }}</p>
          <p><span class="text-(--fg-subtle)">Email:</span> {{ draft.email || '—' }}</p>
        </div>
      </template>
    </div>

    <div class="flex items-center gap-2">
      <button
        type="button"
        :disabled="step === 1"
        class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        @click="prev"
      >
        Back
      </button>
      <button
        type="button"
        :disabled="step === totalSteps"
        class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        @click="next"
      >
        Continue
      </button>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      Reload the page — your step and draft are restored. Closing the tab clears them.
    </p>

    <button
      type="button"
      class="self-start text-xs font-medium text-(--fg-muted) underline-offset-2 hover:underline cursor-pointer"
      @click="clearDraft"
    >
      Discard draft
    </button>
  </div>
</template>
