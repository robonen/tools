<script setup lang="ts">const { getGroupedPackages, getPackages, countEntries, getTotalItems } = useDocs();
const groups = getGroupedPackages();
const packages = getPackages();
const totalItems = getTotalItems();

const kindLabels: Record<string, string> = {
  api: 'api',
  components: 'ui',
  guide: 'guide',
};

useHead({ title: '@robonen/tools — Documentation' });
</script>

<template>
  <div class="max-w-4xl">
    <!-- Hero -->
    <section class="relative mb-16 pt-4">
      <div class="blueprint absolute -inset-x-10 -top-14 bottom-0 -z-10" aria-hidden="true" />

      <div class="comment-label mb-5">field manual · generated from source &amp; jsdoc</div>

      <h1 class="font-display text-5xl sm:text-6xl font-bold tracking-tight text-(--fg) mb-5 text-balance">
        Tools, documented<span class="text-(--accent)">.</span>
      </h1>
      <p class="text-lg text-(--fg-muted) leading-relaxed max-w-2xl">
        A monorepo of TypeScript utilities, Vue composables, headless UI primitives
        and shared tooling — typed, tested and demoed in place.
      </p>

      <div class="mt-7 inline-flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[13px] text-(--fg-subtle) border border-(--border) rounded-md bg-(--bg-elevated) px-3 py-2">
        <span class="text-(--accent-text)">❯</span>
        <span><span class="text-(--fg) font-medium tabular-nums">{{ packages.length }}</span> packages</span>
        <span class="text-(--border-strong)">·</span>
        <span><span class="text-(--fg) font-medium tabular-nums">{{ totalItems }}</span> documented items</span>
        <span class="text-(--border-strong)">·</span>
        <span><span class="text-(--fg) font-medium tabular-nums">{{ groups.length }}</span> groups</span>
      </div>
    </section>

    <!-- Package groups -->
    <section v-for="grp in groups" :key="grp.group" class="mb-12">
      <h2 class="comment-label mb-4">{{ grp.label.toLowerCase() }}</h2>
      <div class="stagger grid grid-cols-1 gap-3 sm:grid-cols-2">
        <NuxtLink
          v-for="pkg in grp.packages"
          :key="pkg.slug"
          :to="`/${pkg.slug}`"
          class="group relative block p-5 rounded-card border border-(--border) bg-(--bg-elevated) hover:border-(--border-strong) hover:shadow-(--shadow-card) transition-all overflow-hidden"
        >
          <!-- Corner notch — fills in on hover like an indicator lamp -->
          <span
            class="absolute right-0 top-0 w-2 h-2 bg-(--accent) opacity-0 group-hover:opacity-100 transition-opacity"
            style="clip-path: polygon(100% 0, 0 0, 100% 100%)"
            aria-hidden="true"
          />

          <div class="flex items-start justify-between gap-3 mb-2">
            <h3 class="font-mono text-sm font-semibold text-(--fg) group-hover:text-(--accent-text) transition-colors">
              {{ pkg.name }}
            </h3>
            <span class="font-mono text-[10px] px-1.5 py-0.5 rounded border border-(--border) bg-(--bg-subtle) text-(--fg-subtle) leading-none shrink-0">
              {{ kindLabels[pkg.kind] }}
            </span>
          </div>
          <p class="text-sm text-(--fg-muted) leading-relaxed line-clamp-2">
            {{ pkg.description }}
          </p>
          <div class="mt-4 flex items-center gap-2 font-mono text-[11px] text-(--fg-subtle)">
            <span>v{{ pkg.version }}</span>
            <span class="text-(--border-strong)">·</span>
            <span class="tabular-nums">{{ countEntries(pkg) }} {{ pkg.kind === 'components' ? 'components' : pkg.kind === 'guide' ? 'sections' : 'items' }}</span>
          </div>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
