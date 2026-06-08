<script setup lang="ts">
import { useBreakpoints, breakpointsTailwind } from './index';

const bp = useBreakpoints(breakpointsTailwind);

const active = bp.active();
const current = bp.current();

const isMobile = bp.smaller('md');
const isDesktop = bp.greaterOrEqual('lg');

const rows: { key: 'sm' | 'md' | 'lg' | 'xl' | '2xl'; width: string }[] = [
  { key: 'sm', width: '640px' },
  { key: 'md', width: '768px' },
  { key: 'lg', width: '1024px' },
  { key: 'xl', width: '1280px' },
  { key: '2xl', width: '1536px' },
];

const device = (): string => (isDesktop.value ? 'Desktop' : isMobile.value ? 'Mobile' : 'Tablet');
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Active breakpoint</span>
      <div class="mt-1 flex items-baseline gap-2">
        <span class="font-mono text-3xl font-bold tabular-nums text-(--fg)">{{ active || 'none' }}</span>
        <span class="rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">{{ device() }}</span>
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Tailwind breakpoints</span>
      <div
        v-for="row in rows"
        :key="row.key"
        class="flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition"
        :class="bp[row.key].value
          ? 'border-(--accent) bg-(--accent-subtle) text-(--accent-text)'
          : 'border-(--border) bg-(--bg-inset) text-(--fg-muted)'"
      >
        <span class="font-mono font-medium">{{ row.key }}</span>
        <span class="font-mono tabular-nums text-(--fg-subtle)">&ge; {{ row.width }}</span>
        <span
          class="h-2 w-2 rounded-full transition"
          :class="bp[row.key].value ? 'bg-(--accent)' : 'bg-(--border-strong)'"
        />
      </div>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-sm text-(--fg) tabular-nums">
      <div class="flex justify-between">
        <span class="text-(--fg-muted)">current()</span>
        <span>[{{ current.length ? current.join(', ') : '—' }}]</span>
      </div>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      Resize your browser window — the matched breakpoints update live.
    </p>
  </div>
</template>
