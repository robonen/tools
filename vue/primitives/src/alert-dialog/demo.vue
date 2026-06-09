<script setup lang="ts">
import { ref } from 'vue';
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@robonen/primitives';

const open = ref(false);
const deleted = ref(false);

function confirmDelete() {
  deleted.value = true;
}

function restore() {
  deleted.value = false;
}
</script>

<template>
  <div class="flex flex-col items-start gap-3 text-(--fg)">
    <p v-if="!deleted" class="text-sm text-(--fg-muted)">
      Project <span class="font-medium text-(--fg)">"acme-web"</span> is live.
    </p>
    <p
      v-else
      class="text-sm text-red-600 dark:text-red-400"
    >
      Project deleted.
      <button
        type="button"
        class="ml-1 underline underline-offset-2 hover:text-red-700 dark:hover:text-red-300"
        @click="restore"
      >
        Undo
      </button>
    </p>

    <AlertDialogRoot v-model:open="open">
      <AlertDialogTrigger
        :disabled="deleted"
        class="inline-flex items-center rounded-md border border-red-300 bg-(--bg) px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
      >
        Delete project
      </AlertDialogTrigger>

      <AlertDialogPortal>
        <AlertDialogOverlay
          class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        />
        <AlertDialogContent
          class="fixed left-1/2 top-1/2 z-50 w-[min(92vw,26rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-(--border) bg-(--bg-elevated) p-5 shadow-xl"
        >
          <AlertDialogTitle class="text-base font-semibold text-(--fg)">
            Delete this project?
          </AlertDialogTitle>
          <AlertDialogDescription class="mt-1.5 text-sm text-(--fg-muted)">
            This permanently removes "acme-web" and all of its deployments.
            This action cannot be undone.
          </AlertDialogDescription>

          <div class="mt-5 flex justify-end gap-2">
            <AlertDialogCancel
              class="inline-flex items-center rounded-md border border-(--border) bg-(--bg) px-3 py-1.5 text-sm font-medium text-(--fg) transition-colors hover:bg-(--bg-subtle) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              class="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              @click="confirmDelete"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>
  </div>
</template>
