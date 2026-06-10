<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import { useCookie } from './index';

// One reactive cookie for the consent preferences. In browsers with the
// Cookie Store API changes from other tabs (and even server Set-Cookie
// responses) sync automatically; elsewhere writes still sync between
// components on this page.
const { state: consent, isReady } = useCookie('demo:consent', {
  analytics: false,
  marketing: false,
}, { maxAge: 60 * 60 * 24 });

// A second instance bound to the same cookie — flips in sync with the first.
// writeDefaults is off so this read-only mirror never races the first
// instance's attributes (it has no maxAge of its own).
const { state: mirror } = useCookie('demo:consent', {
  analytics: false,
  marketing: false,
}, { writeDefaults: false });

const categories = [
  { key: 'analytics', label: 'Analytics', hint: 'Usage metrics' },
  { key: 'marketing', label: 'Marketing', hint: 'Personalized ads' },
] as const;

function toggle(key: (typeof categories)[number]['key']) {
  consent.value = { ...consent.value, [key]: !consent.value[key] };
}

const supportsCookieStore = typeof window !== 'undefined' && 'cookieStore' in window;

// Show the raw cookie as the browser stores it.
const rawCookie = ref('');

watchEffect(() => {
  void consent.value;
  void mirror.value;

  if (typeof document !== 'undefined')
    rawCookie.value = document.cookie.split('; ').find(part => part.startsWith('demo%3Aconsent=')) ?? '(no cookie)';
});

const accepted = computed(() => Object.values(consent.value).filter(Boolean).length);
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Cookie consent</span>
      <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
        <span class="h-1.5 w-1.5 rounded-full" :class="isReady ? 'bg-emerald-500' : 'bg-(--fg-subtle) animate-pulse'" />
        {{ supportsCookieStore ? 'Cookie Store API' : 'document.cookie' }}
      </span>
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-3">
      <button
        v-for="category in categories"
        :key="category.key"
        type="button"
        class="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition active:scale-[0.99] cursor-pointer"
        :class="consent[category.key]
          ? 'border-transparent bg-(--accent)/10'
          : 'border-(--border) bg-(--bg-inset) hover:border-(--border-strong)'"
        @click="toggle(category.key)"
      >
        <span class="flex flex-col">
          <span class="text-sm font-medium text-(--fg)">{{ category.label }}</span>
          <span class="text-xs text-(--fg-subtle)">{{ category.hint }}</span>
        </span>
        <span
          class="relative h-5 w-9 shrink-0 rounded-full transition"
          :class="consent[category.key] ? 'bg-(--accent)' : 'bg-(--border-strong)'"
        >
          <span
            class="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all"
            :class="consent[category.key] ? 'left-4.5' : 'left-0.5'"
          />
        </span>
      </button>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 flex flex-col gap-2 font-mono text-xs text-(--fg)">
      <div class="flex items-center justify-between">
        <span class="text-(--fg-subtle)">second instance</span>
        <span>{{ accepted }}/{{ categories.length }} accepted · {{ JSON.stringify(mirror) }}</span>
      </div>
      <div class="truncate text-(--fg-muted)" :title="rawCookie">
        {{ rawCookie }}
      </div>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      Both cards bind to the same cookie (24h Max-Age) — toggling one updates the other through cookie change events.
    </p>
  </div>
</template>
