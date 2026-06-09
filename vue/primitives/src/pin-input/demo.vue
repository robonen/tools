<script setup lang="ts">
import { PinInputInput, PinInputRoot } from '@robonen/primitives';
import { ref } from 'vue';

const LENGTH = 6;

const code = ref<string[]>([]);
const status = ref<'idle' | 'verifying' | 'ok' | 'error'>('idle');

function onComplete(value: string) {
  status.value = 'verifying';
  // Pretend to call an API; "123456" is the happy path.
  window.setTimeout(() => {
    status.value = value === '123456' ? 'ok' : 'error';
  }, 600);
}

function reset() {
  code.value = [];
  status.value = 'idle';
}
</script>

<template>
  <div class="w-full max-w-sm rounded-xl border border-(--border) bg-(--bg-elevated) p-6 text-(--fg)">
    <h3 class="text-base font-semibold">
      Verify your email
    </h3>
    <p class="mt-1 text-sm text-(--fg-muted)">
      Enter the 6-digit code we sent to your inbox.
    </p>

    <PinInputRoot
      v-slot="{ isComplete }"
      v-model="code"
      :length="LENGTH"
      type="number"
      otp
      :disabled="status === 'verifying' || status === 'ok'"
      class="mt-5 flex items-center gap-2 data-[disabled]:opacity-60"
      @complete="onComplete"
    >
      <PinInputInput
        v-for="i in LENGTH"
        :key="i"
        :index="i - 1"
        class="h-12 w-10 rounded-lg border bg-(--bg) text-center text-lg font-medium text-(--fg) outline-none transition-colors placeholder:text-(--fg-subtle) focus:border-(--accent) focus:ring-2 focus:ring-(--ring) disabled:cursor-not-allowed"
        :class="status === 'error'
          ? 'border-red-500 dark:border-red-400'
          : isComplete && status === 'ok'
            ? 'border-emerald-500 dark:border-emerald-400'
            : 'border-(--border)'"
      />
    </PinInputRoot>

    <div class="mt-4 flex min-h-5 items-center justify-between text-sm">
      <p
        class="font-medium"
        :class="{
          'text-(--fg-subtle)': status === 'idle' || status === 'verifying',
          'text-emerald-600 dark:text-emerald-400': status === 'ok',
          'text-red-600 dark:text-red-400': status === 'error',
        }"
      >
        <span v-if="status === 'verifying'">Verifying…</span>
        <span v-else-if="status === 'ok'">Code accepted</span>
        <span v-else-if="status === 'error'">Invalid code — try again</span>
        <span v-else>Tip: try 123456</span>
      </p>

      <button
        type="button"
        class="rounded-md px-2 py-1 text-sm text-(--accent) transition-colors hover:bg-(--bg-inset)"
        @click="reset"
      >
        Reset
      </button>
    </div>
  </div>
</template>
