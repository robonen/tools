<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { demos } from './router';

const route = useRoute();
const query = ref('');

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  return q ? demos.filter(d => d.name.toLowerCase().includes(q)) : demos;
});

const currentDemoName = computed(() => {
  const n = route.meta.demoName;
  return typeof n === 'string' ? n : '';
});
</script>

<template>
  <div class="grid h-screen grid-cols-[15rem_1fr]">
    <aside class="flex min-h-0 flex-col border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <header class="border-b border-neutral-200 px-4 py-3.5 font-semibold dark:border-neutral-800">
        <RouterLink to="/" class="no-underline">
          @robonen/primitives
        </RouterLink>
        <small class="mt-0.5 block font-normal text-neutral-500 dark:text-neutral-400">playground</small>
      </header>

      <input
        v-model="query"
        type="search"
        placeholder="Filter demos…"
        aria-label="Filter demos"
        class="mx-3 my-2.5 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5 outline-none focus:border-blue-600 dark:border-neutral-800 dark:bg-neutral-950 dark:focus:border-blue-400"
      >

      <nav class="overflow-y-auto px-1.5 pb-3 pt-1">
        <div class="px-2.5 pb-1 pt-3 text-[0.6875rem] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          Demos ({{ filtered.length }})
        </div>
        <RouterLink
          v-for="demo in filtered"
          :key="demo.name"
          :to="demo.routePath"
          custom
        >
          <template #default="{ href, navigate, isActive }">
            <a
              :href="href"
              :aria-current="isActive ? 'page' : undefined"
              class="block rounded-md px-2.5 py-1.5 no-underline hover:bg-neutral-900/5 aria-[current=page]:bg-blue-600 aria-[current=page]:text-white dark:hover:bg-neutral-100/5 dark:aria-[current=page]:bg-blue-500"
              @click="navigate"
            >
              {{ demo.name }}
            </a>
          </template>
        </RouterLink>

        <div v-if="!demos.length" class="px-2.5 pb-1 pt-3 text-[0.6875rem] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          No demos yet
        </div>
      </nav>
    </aside>

    <main class="min-w-0 overflow-auto px-7 py-6">
      <header
        v-if="currentDemoName"
        class="mb-4 flex items-baseline gap-3 border-b border-neutral-200 pb-3 dark:border-neutral-800"
      >
        <h1 class="m-0 text-lg font-semibold">
          {{ currentDemoName }}
        </h1>
        <code class="text-xs text-neutral-500 dark:text-neutral-400">src/demos/{{ currentDemoName }}.vue</code>
      </header>

      <RouterView v-slot="{ Component }">
        <Suspense>
          <template #default>
            <component :is="Component" v-if="Component" />
          </template>
          <template #fallback>
            <div class="text-neutral-500 dark:text-neutral-400">
              Loading…
            </div>
          </template>
        </Suspense>
      </RouterView>
    </main>
  </div>
</template>
