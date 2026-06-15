<script setup lang="ts">
import { computed, ref } from 'vue';
import { usePermission } from './index';
import type { GeneralPermissionDescriptor } from './index';

const names: GeneralPermissionDescriptor['name'][] = [
  'geolocation',
  'camera',
  'microphone',
  'notifications',
  'clipboard-read',
];

// usePermission takes a static descriptor, so instantiate one per permission
// up-front and switch which reactive state we read via the dropdown.
const permissions = names.map(name => ({
  name,
  ...usePermission(name, { controls: true }),
}));

const selected = ref<GeneralPermissionDescriptor['name']>('geolocation');

const active = computed(() => permissions.find(perm => perm.name === selected.value)!);
const isSupported = active.value.isSupported;

const meta = computed(() => {
  switch (active.value.state.value) {
    case 'granted':
      return { label: 'granted', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', ring: 'border-emerald-500/30 bg-emerald-500/10' };
    case 'denied':
      return { label: 'denied', dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400', ring: 'border-red-500/30 bg-red-500/10' };
    case 'prompt':
      return { label: 'prompt', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', ring: 'border-amber-500/30 bg-amber-500/10' };
    default:
      return { label: 'unknown', dot: 'bg-border-strong', text: 'text-fg-subtle', ring: 'border-border bg-bg-inset' };
  }
});
</script>

<template>
  <div class="demo-stack max-w-sm">
    <div
      v-if="!isSupported"
      class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300"
    >
      The Permissions API is not supported in this browser.
    </div>

    <template v-else>
      <div class="flex flex-col gap-1.5">
        <label class="demo-label">
          Permission
        </label>
        <select
          v-model="selected"
          class="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option v-for="name in names" :key="name" :value="name">
            {{ name }}
          </option>
        </select>
      </div>

      <ul class="demo-card divide-y divide-border">
        <li
          v-for="perm in permissions"
          :key="perm.name"
          class="flex items-center justify-between gap-3 px-3 py-2.5"
        >
          <code class="font-mono text-sm text-fg">{{ perm.name }}</code>
          <span class="font-mono text-xs text-fg-muted">{{ perm.state.value ?? 'unknown' }}</span>
        </li>
      </ul>

      <div class="demo-card flex flex-col items-center gap-3 p-5">
        <span class="demo-label">
          {{ selected }}
        </span>
        <span
          class="inline-flex items-center gap-2 rounded-md border px-3 py-1 text-sm font-semibold transition"
          :class="[meta.ring, meta.text]"
        >
          <span class="h-2 w-2 rounded-full" :class="meta.dot" />
          {{ meta.label }}
        </span>
      </div>

      <button
        type="button"
        class="demo-btn-primary"
        @click="active.query()"
      >
        Re-check "{{ selected }}"
      </button>

      <p class="text-center text-xs text-fg-subtle">
        Status updates live if you change a permission in your browser settings.
      </p>
    </template>
  </div>
</template>
