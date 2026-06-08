<script setup lang="ts">
import { ref } from 'vue';
import { useFavicon } from './index';

interface Preset {
  label: string;
  href: string;
  emoji: string;
}

// Tiny inline SVG data-URIs so the demo needs no network/assets.
function emojiFavicon(emoji: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${emoji}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const presets: Preset[] = [
  { label: 'Rocket', emoji: '🚀', href: emojiFavicon('🚀') },
  { label: 'Fire', emoji: '🔥', href: emojiFavicon('🔥') },
  { label: 'Heart', emoji: '💜', href: emojiFavicon('💜') },
  { label: 'Star', emoji: '⭐', href: emojiFavicon('⭐') },
];

const favicon = useFavicon(presets[0].href);
const active = ref(presets[0].label);

function select(preset: Preset) {
  active.value = preset.label;
  favicon.value = preset.href;
}
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <div class="flex items-center gap-2 rounded-lg border border-(--border) bg-(--bg-inset) px-3 py-2">
        <div class="flex gap-1.5">
          <span class="size-2.5 rounded-full bg-red-500/70" />
          <span class="size-2.5 rounded-full bg-amber-500/70" />
          <span class="size-2.5 rounded-full bg-emerald-500/70" />
        </div>
        <div class="ml-2 flex flex-1 items-center gap-2 rounded-md bg-(--bg) px-2 py-1">
          <span class="text-base leading-none">{{ presets.find(p => p.label === active)?.emoji }}</span>
          <span class="truncate text-xs text-(--fg-muted)">My Awesome App</span>
        </div>
      </div>
      <p class="mt-2 text-center text-xs text-(--fg-subtle)">
        Look at the real browser tab — its favicon updates live.
      </p>
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Choose a favicon</span>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="preset in presets"
          :key="preset.label"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition active:scale-[0.98] cursor-pointer"
          :class="active === preset.label
            ? 'border-transparent bg-(--accent) text-(--accent-fg) hover:bg-(--accent-hover)'
            : 'border-(--border) bg-(--bg-elevated) text-(--fg) hover:bg-(--bg-inset) hover:border-(--border-strong)'"
          @click="select(preset)"
        >
          <span class="text-base leading-none">{{ preset.emoji }}</span>
          {{ preset.label }}
        </button>
      </div>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-xs text-(--fg) break-all">
      favicon.value = "{{ presets.find(p => p.label === active)?.emoji }} svg"
    </div>
  </div>
</template>
