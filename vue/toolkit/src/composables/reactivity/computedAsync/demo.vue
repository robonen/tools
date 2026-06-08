<script setup lang="ts">
import { ref } from 'vue';
import { computedAsync } from './index';

interface User {
  name: string;
  role: string;
  city: string;
}

const directory: Record<number, User> = {
  1: { name: 'Ada Lovelace', role: 'Mathematician', city: 'London' },
  2: { name: 'Grace Hopper', role: 'Rear Admiral', city: 'New York' },
  3: { name: 'Alan Turing', role: 'Cryptanalyst', city: 'Cambridge' },
  4: { name: 'Katherine Johnson', role: 'Aerospace Engineer', city: 'Hampton' },
};

const userId = ref(1);
const evaluating = ref(false);
const error = ref<string | null>(null);

// Simulated network fetch with artificial latency.
function fetchUser(id: number, signal: AbortSignal): Promise<User> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const found = directory[id];
      if (found)
        resolve(found);
      else
        reject(new Error(`No user with id ${id}`));
    }, 700);

    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

const user = computedAsync<User | null>(
  async (onCancel) => {
    error.value = null;
    const controller = new AbortController();
    onCancel(() => controller.abort());
    return fetchUser(userId.value, controller.signal);
  },
  null,
  {
    evaluating,
    onError: (e) => {
      if ((e as DOMException)?.name !== 'AbortError')
        error.value = (e as Error).message;
    },
  },
);

const ids = [1, 2, 3, 4, 99];
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="flex flex-col gap-2">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Fetch user by id</span>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="id in ids"
          :key="id"
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition active:scale-[0.98] cursor-pointer"
          :class="userId === id
            ? 'border-transparent bg-(--accent) text-(--accent-fg) hover:bg-(--accent-hover)'
            : 'border-(--border) bg-(--bg-elevated) text-(--fg) hover:bg-(--bg-inset) hover:border-(--border-strong)'"
          @click="userId = id"
        >
          #{{ id }}
        </button>
      </div>
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 min-h-32 flex flex-col justify-center">
      <Transition name="fade" mode="out-in">
        <div v-if="evaluating" key="loading" class="flex items-center gap-2 text-sm text-(--fg-muted)">
          <span class="size-4 animate-spin rounded-full border-2 border-(--border) border-t-(--accent)" />
          Resolving promise…
        </div>

        <div v-else-if="error" key="error" class="flex flex-col gap-1">
          <span class="text-sm font-medium text-red-600 dark:text-red-400">Evaluation failed</span>
          <span class="font-mono text-xs text-(--fg-muted)">{{ error }}</span>
        </div>

        <div v-else-if="user" key="user" class="flex flex-col gap-1">
          <span class="text-lg font-semibold text-(--fg)">{{ user.name }}</span>
          <span class="text-sm text-(--fg-muted)">{{ user.role }}</span>
          <span class="inline-flex w-fit items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
            {{ user.city }}
          </span>
        </div>

        <div v-else key="empty" class="text-sm text-(--fg-subtle)">
          Awaiting first resolution…
        </div>
      </Transition>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">evaluating</span>
      <span
        class="inline-flex items-center gap-1.5 font-mono text-sm tabular-nums"
        :class="evaluating ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'"
      >
        <span class="size-1.5 rounded-full" :class="evaluating ? 'bg-amber-500' : 'bg-emerald-500'" />
        {{ evaluating }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
