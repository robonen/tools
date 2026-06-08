<script setup lang="ts">
import { computed, defineComponent, h, reactive } from 'vue';
import { useContextFactory } from './index';

interface ThemeContext {
  accent: string;
  density: 'cozy' | 'compact';
}

// Create a typed, uniquely-keyed context once. `provide` is used by the parent,
// `inject` by any descendant — no string-key collisions, fully type-safe.
const ThemeCtx = useContextFactory<ThemeContext>('DemoTheme');

// Parent owns the source of truth and provides it down the tree.
const theme = reactive<ThemeContext>({ accent: '#6366f1', density: 'cozy' });
ThemeCtx.provide(theme);

const accents = ['#6366f1', '#10b981', '#f43f5e', '#0ea5e9'];

// A descendant component that reads context via inject() — no props drilling.
const ThemedCard = defineComponent({
  name: 'ThemedCard',
  setup() {
    const ctx = ThemeCtx.inject();
    const pad = computed(() => (ctx.density === 'cozy' ? '16px' : '8px'));
    return () =>
      h(
        'div',
        {
          class: 'rounded-lg border border-(--border) bg-(--bg-inset)',
          style: { padding: pad.value, borderLeft: `3px solid ${ctx.accent}` },
        },
        [
          h('div', { class: 'text-sm font-medium text-(--fg)' }, 'Injected child'),
          h(
            'div',
            { class: 'font-mono text-xs tabular-nums text-(--fg-muted)' },
            `accent ${ctx.accent} · ${ctx.density}`,
          ),
        ],
      );
  },
});
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-4">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Provider (parent)</span>

      <div class="flex flex-col gap-2">
        <span class="text-xs text-(--fg-muted)">Accent</span>
        <div class="flex gap-2">
          <button
            v-for="color in accents"
            :key="color"
            type="button"
            :aria-pressed="theme.accent === color"
            class="size-8 rounded-lg border-2 transition active:scale-[0.95] cursor-pointer"
            :class="theme.accent === color ? 'border-(--accent) scale-110' : 'border-(--border) hover:border-(--border-strong)'"
            :style="{ backgroundColor: color }"
            @click="theme.accent = color"
          />
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-xs text-(--fg-muted)">Density</span>
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            class="inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition active:scale-[0.98] cursor-pointer"
            :class="theme.density === 'cozy'
              ? 'border-transparent bg-(--accent) text-(--accent-fg) hover:bg-(--accent-hover)'
              : 'border-(--border) bg-(--bg-elevated) text-(--fg) hover:bg-(--bg-inset) hover:border-(--border-strong)'"
            @click="theme.density = 'cozy'"
          >
            Cozy
          </button>
          <button
            type="button"
            class="inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition active:scale-[0.98] cursor-pointer"
            :class="theme.density === 'compact'
              ? 'border-transparent bg-(--accent) text-(--accent-fg) hover:bg-(--accent-hover)'
              : 'border-(--border) bg-(--bg-elevated) text-(--fg) hover:bg-(--bg-inset) hover:border-(--border-strong)'"
            @click="theme.density = 'compact'"
          >
            Compact
          </button>
        </div>
      </div>
    </div>

    <!-- Descendant resolves the value through inject(), no props passed in -->
    <ThemedCard />

    <p class="text-xs text-(--fg-subtle)">
      The card reads context with <span class="font-mono text-(--fg-muted)">inject()</span> — change the controls above
      and it updates without a single prop.
    </p>
  </div>
</template>
