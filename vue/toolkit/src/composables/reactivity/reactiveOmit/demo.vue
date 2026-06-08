<script setup lang="ts">
import { reactive } from 'vue';
import { reactiveOmit } from './index';

const user = reactive({
  name: 'Ada Lovelace',
  email: 'ada@analytical.engine',
  role: 'admin',
  token: 'sk_live_8f2a91c3',
  active: true,
});

// Omit listed keys — stays reactive as the source changes.
const safeUser = reactiveOmit(user, 'token', ['email']);

// Predicate form — drop every boolean field.
const noFlags = reactiveOmit(user, value => typeof value === 'boolean');

const roles = ['admin', 'editor', 'viewer'] as const;
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="space-y-3 rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <p class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Source object
      </p>

      <label class="flex flex-col gap-1">
        <span class="text-xs font-medium text-(--fg-muted)">name</span>
        <input
          v-model="user.name"
          class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
        >
      </label>

      <div class="flex items-center justify-between gap-3">
        <span class="text-xs font-medium text-(--fg-muted)">role</span>
        <div class="flex gap-1.5">
          <button
            v-for="r in roles"
            :key="r"
            type="button"
            class="rounded-md border px-2 py-0.5 text-xs font-medium transition cursor-pointer"
            :class="user.role === r
              ? 'border-transparent bg-(--accent) text-(--accent-fg)'
              : 'border-(--border) bg-(--bg-inset) text-(--fg-muted) hover:border-(--border-strong)'"
            @click="user.role = r"
          >
            {{ r }}
          </button>
        </div>
      </div>

      <label class="flex items-center justify-between gap-3">
        <span class="text-xs font-medium text-(--fg-muted)">active</span>
        <button
          type="button"
          class="relative h-5 w-9 rounded-full transition cursor-pointer"
          :class="user.active ? 'bg-(--accent)' : 'bg-(--bg-inset)'"
          role="switch"
          :aria-checked="user.active"
          @click="user.active = !user.active"
        >
          <span
            class="absolute top-0.5 size-4 rounded-full bg-white shadow transition-all"
            :class="user.active ? 'left-4' : 'left-0.5'"
          />
        </button>
      </label>
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <p class="mb-2 text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Omit <code class="text-(--accent-text)">token</code>, <code class="text-(--accent-text)">email</code>
      </p>
      <pre class="overflow-x-auto rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-xs text-(--fg)">{{ safeUser }}</pre>
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <p class="mb-2 text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Predicate: drop booleans
      </p>
      <pre class="overflow-x-auto rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-xs text-(--fg)">{{ noFlags }}</pre>
    </div>
  </div>
</template>
