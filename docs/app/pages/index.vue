<script setup lang="ts">const { getGroupedPackages, getPackages, countEntries, getTotalItems } = useDocs();
const groups = getGroupedPackages();
const packages = getPackages();
const totalItems = getTotalItems();

const kindMeta: Record<string, { label: string; cls: string }> = {
  api: { label: 'API', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' },
  components: { label: 'Components', cls: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300' },
  guide: { label: 'Guide', cls: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300' },
};

useHead({ title: '@robonen/tools — Documentation' });
</script>

<template>
  <div class="max-w-4xl">
    <!-- Hero -->
    <section class="mb-14">
      <div class="inline-flex items-center gap-2 mb-5 px-3 py-1 rounded-full border border-(--border) bg-(--bg-subtle) text-xs text-(--fg-muted)">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Auto-generated from source &amp; JSDoc
      </div>
      <h1 class="text-4xl sm:text-5xl font-bold tracking-tight text-(--fg) mb-4">
        @robonen/tools
      </h1>
      <p class="text-lg text-(--fg-muted) leading-relaxed max-w-2xl">
        A monorepo of TypeScript utilities, Vue composables, headless UI primitives
        and shared tooling — documented, typed and tested.
      </p>
      <div class="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-(--fg-subtle)">
        <span><span class="text-(--fg) font-semibold">{{ packages.length }}</span> packages</span>
        <span><span class="text-(--fg) font-semibold">{{ totalItems }}</span> documented items</span>
        <span><span class="text-(--fg) font-semibold">{{ groups.length }}</span> groups</span>
      </div>
    </section>

    <!-- Package groups -->
    <section v-for="grp in groups" :key="grp.group" class="mb-10">
      <h2 class="text-xs font-semibold uppercase tracking-wider text-(--fg-subtle) mb-4">
        {{ grp.label }}
      </h2>
      <div class="grid gap-3 sm:grid-cols-2">
        <NuxtLink
          v-for="pkg in grp.packages"
          :key="pkg.slug"
          :to="`/${pkg.slug}`"
          class="group relative block p-5 rounded-card border border-(--border) bg-(--bg-elevated) hover:border-(--border-strong) hover:shadow-(--shadow-card) transition-all"
        >
          <div class="flex items-start justify-between gap-3 mb-2">
            <h3 class="font-mono text-sm font-semibold text-(--fg) group-hover:text-(--accent-text) transition-colors">
              {{ pkg.name }}
            </h3>
            <span :class="['text-[10px] px-2 py-0.5 rounded-full font-medium leading-none shrink-0', kindMeta[pkg.kind]?.cls]">
              {{ kindMeta[pkg.kind]?.label }}
            </span>
          </div>
          <p class="text-sm text-(--fg-muted) leading-relaxed line-clamp-2">
            {{ pkg.description }}
          </p>
          <div class="mt-4 flex items-center gap-3 text-xs text-(--fg-subtle)">
            <span class="font-mono">v{{ pkg.version }}</span>
            <span>·</span>
            <span>{{ countEntries(pkg) }} {{ pkg.kind === 'components' ? 'components' : pkg.kind === 'guide' ? 'sections' : 'items' }}</span>
          </div>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
