<script setup lang="ts">
import { computed, ref } from 'vue';
import { useElementByPoint } from './index';

// Viewport coordinates to probe — driven by the user moving the cursor over
// the playground area below.
const x = ref(0);
const y = ref(0);
const tracking = ref(false);

const { element, isSupported, toggle } = useElementByPoint({ x, y });

const active = ref(true);

function onToggle(): void {
  toggle();
  active.value = !active.value;
}

function onMove(event: MouseEvent): void {
  x.value = event.clientX;
  y.value = event.clientY;
  tracking.value = true;
}

function onLeave(): void {
  tracking.value = false;
}

// Build a friendly description of whatever the probe currently sits on.
const elementInfo = computed(() => {
  const el = element.value as Element | null;
  if (!el) return null;

  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const cls = el.className && typeof el.className === 'string'
    ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}`
    : '';

  return { tag, selector: `${tag}${id}${cls}`, text: el.textContent?.trim().slice(0, 40) ?? '' };
});

const coords = computed(() => `${Math.round(x.value)}, ${Math.round(y.value)}`);
</script>

<template>
  <div class="w-full max-w-md flex flex-col gap-4">
    <div
      v-if="!isSupported"
      class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300"
    >
      elementFromPoint is not supported in this browser.
    </div>

    <template v-else>
      <!-- Probe surface: hover anywhere inside to feed live viewport coordinates -->
      <div
        class="relative grid h-40 place-items-center overflow-hidden rounded-xl border border-(--border) bg-(--bg-inset)"
        @mousemove="onMove"
        @mouseleave="onLeave"
      >
        <div class="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-2 gap-2 p-3 opacity-70">
          <div
            v-for="cell in ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta']"
            :key="cell"
            :data-cell="cell"
            class="grid place-items-center rounded-lg border border-(--border) bg-(--bg-elevated) text-xs font-medium text-(--fg-muted)"
          >
            {{ cell }}
          </div>
        </div>
        <span class="pointer-events-none relative rounded-md bg-(--bg)/70 px-2 py-1 text-xs text-(--fg-subtle) backdrop-blur">
          {{ tracking ? 'Probing…' : 'Move your cursor here' }}
        </span>
      </div>

      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-sm text-(--fg) tabular-nums flex flex-col gap-1.5">
        <div class="flex items-center justify-between">
          <span class="text-(--fg-subtle)">point</span>
          <span>{{ coords }}</span>
        </div>
        <div class="flex items-center justify-between gap-3">
          <span class="text-(--fg-subtle)">element</span>
          <span class="truncate text-(--accent-text)">{{ elementInfo?.selector ?? '—' }}</span>
        </div>
        <div v-if="elementInfo?.text" class="flex items-center justify-between gap-3">
          <span class="text-(--fg-subtle)">text</span>
          <span class="truncate text-(--fg-muted)">{{ elementInfo.text }}</span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="onToggle"
        >
          <span class="size-1.5 rounded-full" :class="active ? 'bg-emerald-500' : 'bg-(--fg-subtle)'" />
          {{ active ? 'Pause sampling' : 'Resume sampling' }}
        </button>
        <span class="text-xs text-(--fg-subtle)">Sampled every animation frame</span>
      </div>
    </template>
  </div>
</template>
