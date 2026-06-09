<script setup lang="ts">
import { ref } from 'vue';
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from '@robonen/primitives';

const open = ref(false);

const name = ref('Ada Lovelace');
const email = ref('ada@example.com');
const saved = ref('');

const draftName = ref(name.value);
const draftEmail = ref(email.value);

function onOpenAutoFocus() {
  // Start from the current values each time the dialog opens.
  draftName.value = name.value;
  draftEmail.value = email.value;
}

function save() {
  name.value = draftName.value;
  email.value = draftEmail.value;
  saved.value = `${name.value} · ${email.value}`;
  open.value = false;
}
</script>

<template>
  <div class="flex flex-col items-start gap-3 text-(--fg)">
    <div class="flex items-center gap-3">
      <div class="flex size-9 items-center justify-center rounded-full bg-(--accent) text-sm font-semibold text-(--accent-fg)">
        {{ name.charAt(0) }}
      </div>
      <div class="text-sm leading-tight">
        <div class="font-medium">{{ name }}</div>
        <div class="text-(--fg-muted)">{{ email }}</div>
      </div>
    </div>

    <p v-if="saved" class="text-xs text-emerald-600 dark:text-emerald-400">
      Saved: {{ saved }}
    </p>

    <DialogRoot v-model:open="open">
      <DialogTrigger
        class="inline-flex items-center rounded-md border border-(--border) bg-(--bg) px-3 py-1.5 text-sm font-medium text-(--fg) transition-colors hover:bg-(--bg-subtle) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
      >
        Edit profile
      </DialogTrigger>

      <DialogPortal>
        <DialogOverlay class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <DialogContent
          class="fixed left-1/2 top-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-(--border) bg-(--bg-elevated) p-5 shadow-xl focus:outline-none"
          @open-auto-focus="onOpenAutoFocus"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <DialogTitle class="text-base font-semibold text-(--fg)">
                Edit profile
              </DialogTitle>
              <DialogDescription class="mt-1 text-sm text-(--fg-muted)">
                Update your name and email. Changes apply when you save.
              </DialogDescription>
            </div>

            <DialogClose
              aria-label="Close"
              class="-mr-1 -mt-1 inline-flex size-7 items-center justify-center rounded-md text-(--fg-muted) transition-colors hover:bg-(--bg-subtle) hover:text-(--fg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
            >
              <svg
                class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </DialogClose>
          </div>

          <form class="mt-4 flex flex-col gap-3" @submit.prevent="save">
            <label class="flex flex-col gap-1 text-sm">
              <span class="font-medium text-(--fg)">Name</span>
              <input
                v-model="draftName"
                type="text"
                class="rounded-md border border-(--border) bg-(--bg) px-2.5 py-1.5 text-(--fg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
              >
            </label>
            <label class="flex flex-col gap-1 text-sm">
              <span class="font-medium text-(--fg)">Email</span>
              <input
                v-model="draftEmail"
                type="email"
                class="rounded-md border border-(--border) bg-(--bg) px-2.5 py-1.5 text-(--fg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
              >
            </label>

            <div class="mt-2 flex justify-end gap-2">
              <DialogClose
                class="inline-flex items-center rounded-md border border-(--border) bg-(--bg) px-3 py-1.5 text-sm font-medium text-(--fg) transition-colors hover:bg-(--bg-subtle) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
              >
                Cancel
              </DialogClose>
              <button
                type="submit"
                class="inline-flex items-center rounded-md bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition-colors hover:bg-(--accent-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
              >
                Save changes
              </button>
            </div>
          </form>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </div>
</template>
