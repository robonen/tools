<script setup lang="ts">
import { effectScope, ref } from 'vue';
import { tryOnScopeDispose } from './index';

interface LogEntry {
  id: number;
  label: string;
  kind: 'create' | 'dispose' | 'noop';
}

let seq = 0;
const log = ref<LogEntry[]>([]);
const activeScopes = ref(0);

function push(label: string, kind: LogEntry['kind']) {
  log.value.unshift({ id: ++seq, label, kind });
}

let current: ReturnType<typeof effectScope> | null = null;

// Create a fresh effect scope and register a dispose hook inside it.
function createScope() {
  const id = activeScopes.value + 1;
  const scope = effectScope();

  scope.run(() => {
    const registered = tryOnScopeDispose(() => {
      activeScopes.value--;
      push(`scope #${id} disposed → cleanup ran`, 'dispose');
    });

    push(
      registered
        ? `scope #${id} created → hook registered`
        : `scope #${id} created → no active scope (skipped)`,
      registered ? 'create' : 'noop',
    );
  });

  // Stop any previously open scope first so only one is live at a time.
  current?.stop();
  current = scope;
  activeScopes.value = 1;
}

function disposeScope() {
  current?.stop();
  current = null;
}

// Demonstrates the graceful fallback: outside any scope it returns false.
function callOutsideScope() {
  const registered = tryOnScopeDispose(() => {});
  push(
    registered
      ? 'unexpected: registered outside a scope'
      : 'called outside scope → returned false (no-op)',
    'noop',
  );
}
</script>

<template>
  <div class="flex w-full max-w-md flex-col gap-4">
    <div class="flex items-center justify-between gap-3">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">tryOnScopeDispose</span>
      <span
        class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium"
        :class="activeScopes > 0
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-(--border) bg-(--bg-inset) text-(--fg-muted)'"
      >
        <span
          class="h-1.5 w-1.5 rounded-full"
          :class="activeScopes > 0 ? 'bg-emerald-500' : 'bg-(--fg-subtle)'"
        />
        {{ activeScopes > 0 ? 'scope active' : 'no scope' }}
      </span>
    </div>

    <div class="grid grid-cols-3 gap-2">
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
        @click="createScope"
      >
        Create scope
      </button>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="activeScopes === 0"
        @click="disposeScope"
      >
        Dispose
      </button>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
        @click="callOutsideScope"
      >
        Outside
      </button>
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Event log</span>

      <ul v-if="log.length" class="mt-3 flex flex-col gap-2">
        <li
          v-for="entry in log"
          :key="entry.id"
          class="flex items-center gap-2.5 text-sm"
        >
          <span
            class="h-1.5 w-1.5 shrink-0 rounded-full"
            :class="{
              'bg-emerald-500': entry.kind === 'create',
              'bg-rose-500': entry.kind === 'dispose',
              'bg-(--fg-subtle)': entry.kind === 'noop',
            }"
          />
          <span class="text-(--fg)">{{ entry.label }}</span>
        </li>
      </ul>

      <p v-else class="mt-3 text-sm text-(--fg-subtle)">
        Create a scope to register a cleanup hook, then dispose it to watch the callback fire.
      </p>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      Inside an active effect scope the cleanup is registered and runs on disposal. Called with no scope present, it
      simply returns <code class="font-mono text-(--fg)">false</code> instead of throwing.
    </p>
  </div>
</template>
