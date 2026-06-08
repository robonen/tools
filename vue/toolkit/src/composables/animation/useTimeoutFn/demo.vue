<script setup lang="ts">
import { ref } from 'vue';
import { useTimeoutFn } from './index';

interface Mail {
  id: number;
  from: string;
  subject: string;
}

const inbox = ref<Mail[]>([
  { id: 1, from: 'Ada Lovelace', subject: 'Notes on the Analytical Engine' },
  { id: 2, from: 'Grace Hopper', subject: 'Found a bug in the relay' },
  { id: 3, from: 'Alan Turing', subject: 'Re: Halting problem' },
]);

const pendingDelete = ref<Mail | null>(null);

// After the grace period elapses the mail is permanently removed.
const { isPending, start, stop } = useTimeoutFn(
  () => {
    if (pendingDelete.value)
      inbox.value = inbox.value.filter(m => m.id !== pendingDelete.value!.id);

    pendingDelete.value = null;
  },
  5000,
  { immediate: false },
);

function archive(mail: Mail) {
  stop();
  pendingDelete.value = mail;
  start();
}

function undo() {
  stop();
  pendingDelete.value = null;
}
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-3">
    <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Inbox · undo with grace period</span>

    <ul v-if="inbox.length" class="flex flex-col gap-2">
      <li
        v-for="mail in inbox"
        :key="mail.id"
        class="flex items-center justify-between gap-3 rounded-xl border border-(--border) bg-(--bg-elevated) p-3 transition"
        :class="{ 'opacity-40': pendingDelete?.id === mail.id }"
      >
        <div class="min-w-0">
          <div class="truncate text-sm font-medium text-(--fg)">{{ mail.subject }}</div>
          <div class="truncate text-xs text-(--fg-muted)">{{ mail.from }}</div>
        </div>
        <button
          type="button"
          :disabled="isPending"
          class="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          @click="archive(mail)"
        >
          Archive
        </button>
      </li>
    </ul>

    <div v-else class="rounded-xl border border-dashed border-(--border) bg-(--bg-inset) p-6 text-center text-sm text-(--fg-subtle)">
      Inbox zero — everything archived.
    </div>

    <Transition
      enter-active-class="transition duration-200" enter-from-class="opacity-0 translate-y-1"
      leave-active-class="transition duration-150" leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-if="isPending && pendingDelete"
        class="flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2"
      >
        <span class="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
          <span class="size-1.5 animate-pulse rounded-full bg-amber-500" />
          Archiving “{{ pendingDelete.subject }}”…
        </span>
        <button
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-0.5 text-sm font-semibold text-amber-700 underline-offset-2 transition hover:underline dark:text-amber-400 cursor-pointer"
          @click="undo"
        >
          Undo
        </button>
      </div>
    </Transition>
  </div>
</template>
