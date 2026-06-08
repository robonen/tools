<script setup lang="ts">
import { ref } from 'vue';
import { toReactive } from './index';

interface Profile {
  name: string;
  role: string;
  level: number;
}

// A ref holding an object, exposed as a reactive proxy. Writes to the proxy
// flow straight through to source.value, and reads survive reassignment.
const source = ref<Profile>({ name: 'Ada Lovelace', role: 'Engineer', level: 3 });
const profile = toReactive(source);

const presets: Profile[] = [
  { name: 'Ada Lovelace', role: 'Engineer', level: 3 },
  { name: 'Alan Turing', role: 'Researcher', level: 5 },
  { name: 'Grace Hopper', role: 'Architect', level: 8 },
];

// Reassign the whole underlying ref — the proxy keeps pointing at fresh data.
function loadPreset(p: Profile) {
  source.value = { ...p };
}
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-3">
      <label class="flex flex-col gap-1.5">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Name</span>
        <input
          v-model="profile.name"
          type="text"
          class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
        >
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Role</span>
        <input
          v-model="profile.role"
          type="text"
          class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
        >
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
          Level: {{ profile.level }}
        </span>
        <input
          v-model.number="profile.level"
          type="range"
          min="1"
          max="10"
          step="1"
          class="w-full accent-(--accent) cursor-pointer"
        >
      </label>
    </div>

    <div class="flex flex-col gap-1.5">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">source.value (the backing ref)</span>
      <pre class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-xs text-(--fg) overflow-x-auto">{{ JSON.stringify(source, null, 2) }}</pre>
    </div>

    <div class="flex flex-col gap-1.5">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Reassign the whole ref</span>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="preset in presets"
          :key="preset.name"
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="loadPreset(preset)"
        >
          {{ preset.name.split(' ')[0] }}
        </button>
      </div>
      <p class="text-xs text-(--fg-subtle)">
        The proxy survives reassignment — fields above update without re-binding.
      </p>
    </div>
  </div>
</template>
