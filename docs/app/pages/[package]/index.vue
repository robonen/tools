<script setup lang="ts">import { sections } from '#docs/sections';

const route = useRoute();
const { getPackage, countEntries, getIntro } = useDocs();

const slug = computed(() => route.params.package as string);
const pkg = computed(() => getPackage(slug.value));

if (!pkg.value) {
  throw createError({ statusCode: 404, message: `Package "${slug.value}" not found` });
}

// Hand-authored intro (docs/intro.vue) renders as the package hero when present.
const intro = computed(() => getIntro(pkg.value!));
const introComponent = computed(() => intro.value ? sections[`${slug.value}/introduction`] ?? null : null);

useHead({ title: `${pkg.value.name} — @robonen/tools` });

const kindLabel = computed(() => ({
  api: 'API Reference',
  components: 'Components',
  guide: 'Guide',
}[pkg.value!.kind]));

// For guide packages, surface the overview section inline.
const overview = computed(() =>
  pkg.value?.kind === 'guide' ? pkg.value.sections.find(s => s.slug === 'overview') : undefined,
);
const otherSections = computed(() =>
  pkg.value?.kind === 'guide' ? pkg.value.sections.filter(s => s.slug !== 'overview') : [],
);
</script>

<template>
  <div v-if="pkg" class="max-w-3xl">
    <!-- Hand-authored intro hero (docs/intro.vue) -->
    <section v-if="introComponent" class="docs-section mb-12">
      <component :is="introComponent" />
    </section>

    <!-- Auto header (shown only when there's no hand-authored intro) -->
    <header v-else class="mb-8 pb-8 border-b border-(--border)">
      <div class="flex items-center gap-2.5 mb-2 flex-wrap">
        <h1 class="font-mono text-2xl font-bold tracking-tight text-(--fg)">{{ pkg.name }}</h1>
        <DocsTag :label="`v${pkg.version}`" variant="neutral" />
      </div>
      <p class="text-(--fg-muted) text-[15px] leading-relaxed">{{ pkg.description }}</p>
      <div class="mt-4 flex items-center gap-3 text-xs text-(--fg-subtle)">
        <span>{{ kindLabel }}</span>
        <span>·</span>
        <span>{{ countEntries(pkg) }} entries</span>
      </div>
      <div class="mt-5">
        <DocsCode :code="`pnpm add ${pkg.name}`" lang="bash" />
      </div>
    </header>

    <!-- When an intro replaces the header, label the auto-generated reference -->
    <h2 v-if="introComponent && pkg.kind === 'api'" class="text-xs font-semibold uppercase tracking-wider text-(--fg-subtle) mb-4 pt-2">
      API Reference
    </h2>

    <!-- API: categories of items -->
    <template v-if="pkg.kind === 'api'">
      <section v-for="category in pkg.categories" :key="category.slug" class="mb-10">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-(--fg-subtle) mb-4">
          {{ category.name }}
          <span class="ml-1 text-(--fg-subtle) normal-case font-normal">· {{ category.items.length }}</span>
        </h2>
        <div class="grid grid-cols-1 gap-2">
          <NuxtLink
            v-for="item in category.items"
            :key="item.slug"
            :to="`/${pkg.slug}/${item.slug}`"
            class="group flex items-center gap-3 p-3 rounded-xl border border-(--border) bg-(--bg-elevated) hover:border-(--border-strong) hover:bg-(--bg-subtle) transition-all"
          >
            <DocsBadge :kind="item.kind" />
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-mono text-sm font-medium text-(--fg) group-hover:text-(--accent-text) transition-colors">{{ item.name }}</span>
                <DocsTag v-if="item.hasTests" label="tested" variant="test" />
                <DocsTag v-if="item.hasDemo" label="demo" variant="demo" />
              </div>
              <p v-if="item.description" class="text-sm text-(--fg-subtle) mt-0.5 truncate">{{ item.description }}</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-(--fg-subtle) group-hover:text-(--accent-text) transition-colors shrink-0">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </NuxtLink>
        </div>
      </section>
    </template>

    <!-- Components: gallery -->
    <template v-else-if="pkg.kind === 'components'">
      <section>
        <h2 class="text-xs font-semibold uppercase tracking-wider text-(--fg-subtle) mb-4">
          All components <span class="normal-case font-normal">· {{ pkg.components.length }}</span>
        </h2>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <NuxtLink
            v-for="c in pkg.components"
            :key="c.slug"
            :to="`/${pkg.slug}/${c.slug}`"
            class="group block p-4 rounded-xl border border-(--border) bg-(--bg-elevated) hover:border-(--border-strong) hover:shadow-(--shadow-card) transition-all"
          >
            <div class="flex items-center justify-between gap-2 mb-1.5">
              <span class="font-semibold text-(--fg) group-hover:text-(--accent-text) transition-colors">{{ c.name }}</span>
              <span class="text-[11px] text-(--fg-subtle)">{{ c.parts.length }} parts</span>
            </div>
            <p v-if="c.description" class="text-sm text-(--fg-subtle) line-clamp-2">{{ c.description }}</p>
            <div class="mt-3 flex flex-wrap gap-1">
              <span
                v-for="part in c.parts.slice(0, 4)"
                :key="part.name"
                class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-(--bg-inset) border border-(--border) text-(--fg-subtle)"
              >
                {{ part.role }}
              </span>
              <span v-if="c.parts.length > 4" class="text-[10px] text-(--fg-subtle) px-1">+{{ c.parts.length - 4 }}</span>
            </div>
          </NuxtLink>
        </div>
      </section>
    </template>

    <!-- Guide: overview markdown + section links -->
    <template v-else>
      <DocsMarkdown v-if="overview" :source="overview.markdown" />
      <section v-if="otherSections.length > 0" class="mt-10 pt-8 border-t border-(--border)">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-(--fg-subtle) mb-4">Sections</h2>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <NuxtLink
            v-for="s in otherSections"
            :key="s.slug"
            :to="`/${pkg.slug}/${s.slug}`"
            class="group flex items-center justify-between gap-3 p-3.5 rounded-xl border border-(--border) bg-(--bg-elevated) hover:border-(--border-strong) hover:bg-(--bg-subtle) transition-all"
          >
            <span class="text-sm font-medium text-(--fg) group-hover:text-(--accent-text) transition-colors">{{ s.title }}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-(--fg-subtle) group-hover:text-(--accent-text) transition-colors shrink-0">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </NuxtLink>
        </div>
      </section>
    </template>
  </div>
</template>
