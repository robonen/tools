<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useCloseWatcher } from './index';

const { isSupported, onClose, close } = useCloseWatcher();

const open = ref(false);
const lastClosedAt = ref<string | null>(null);
const closeCount = ref(0);

onMounted(() => {
  onClose(() => {
    if (!open.value)
      return;
    open.value = false;
    closeCount.value++;
    lastClosedAt.value = new Date().toLocaleTimeString();
  });
});
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">CloseWatcher API</span>
      <span
        class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium"
        :class="isSupported
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'"
      >
        {{ isSupported ? 'Native' : 'Esc fallback' }}
      </span>
    </div>

    <button
      class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
      :disabled="open"
      @click="open = true"
    >
      Open dialog
    </button>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-1"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div v-if="open" class="rounded-xl border border-(--border-strong) bg-(--bg-elevated) p-4 shadow-lg">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-(--fg)">Unsaved changes</p>
            <p class="mt-1 text-sm text-(--fg-muted)">
              Press <kbd class="rounded border border-(--border) bg-(--bg-inset) px-1.5 py-0.5 font-mono text-xs text-(--fg)">Esc</kbd>
              (or the Android back gesture) to dismiss.
            </p>
          </div>
        </div>
        <div class="mt-4 flex justify-end gap-2">
          <button
            class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
            @click="close()"
          >
            Dismiss via close()
          </button>
        </div>
      </div>
    </Transition>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-sm text-(--fg) tabular-nums">
      <div class="flex justify-between">
        <span class="text-(--fg-muted)">closes</span>
        <span class="font-bold">{{ closeCount }}</span>
      </div>
      <div class="mt-1 flex justify-between">
        <span class="text-(--fg-muted)">last</span>
        <span>{{ lastClosedAt ?? '—' }}</span>
      </div>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      Open the dialog, then dismiss it with Esc, the system back gesture, or the programmatic <code class="font-mono">close()</code> call.
    </p>
  </div>
</template>
