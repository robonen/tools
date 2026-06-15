<script setup lang="ts">
import { ref } from 'vue';
import { useId } from './index';

// An auto-generated, SSR-safe id — ideal for wiring <label for> to an input.
const fieldId = useId('email-field');

// A second id using a custom prefix, demonstrating how primitives namespace ids.
const helpId = useId(undefined, 'dialog');

// A "deterministic" id: when the caller supplies a value, it wins over the
// generated one — exactly how a component would respect a user-provided `id` prop.
const userProvided = ref('');
const resolvedId = useId(() => userProvided.value || undefined, 'panel');

const email = ref('');
</script>

<template>
  <div class="demo-stack max-w-sm">
    <div class="demo-card p-4 flex flex-col gap-2.5">
      <label :for="fieldId" class="demo-label">
        Email
      </label>
      <input
        :id="fieldId"
        v-model="email"
        type="email"
        :aria-describedby="helpId"
        placeholder="ada@example.com"
        class="demo-input"
      >
      <p :id="helpId" class="text-xs text-fg-subtle">
        The <span class="font-mono">label</span>, <span class="font-mono">input</span> and this hint are
        linked by generated ids — no hard-coded strings, no collisions.
      </p>
    </div>

    <div class="rounded-lg border border-border bg-bg-inset p-3 font-mono text-sm text-fg tabular-nums flex flex-col gap-1.5">
      <div class="flex items-center justify-between gap-3">
        <span class="text-fg-subtle">field</span>
        <span class="truncate">{{ fieldId }}</span>
      </div>
      <div class="flex items-center justify-between gap-3">
        <span class="text-fg-subtle">help</span>
        <span class="truncate">{{ helpId }}</span>
      </div>
    </div>

    <label class="flex flex-col gap-1.5">
      <span class="demo-label">Deterministic override</span>
      <input
        v-model="userProvided"
        type="text"
        placeholder="Leave blank to auto-generate"
        class="demo-input"
      >
    </label>

    <div class="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg-inset px-3 py-2.5">
      <span class="demo-label">Resolved</span>
      <span class="truncate font-mono text-sm text-accent-text tabular-nums">{{ resolvedId }}</span>
    </div>
  </div>
</template>
