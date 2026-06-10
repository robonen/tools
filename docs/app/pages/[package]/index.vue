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

// ── API reference: filterable, chip-navigable categories ──────────────────
const query = ref('');

const filteredCategories = computed(() => {
  if (pkg.value?.kind !== 'api') return [];

  const needle = query.value.trim().toLowerCase();

  if (!needle) return pkg.value.categories;

  return pkg.value.categories
    .map(category => ({
      ...category,
      items: category.items.filter(item =>
        item.name.toLowerCase().includes(needle)
        || item.description?.toLowerCase().includes(needle),
      ),
    }))
    .filter(category => category.items.length > 0);
});

const filteredCount = computed(() =>
  filteredCategories.value.reduce((total, category) => total + category.items.length, 0),
);

function scrollToCategory(catSlug: string) {
  document.getElementById(`cat-${catSlug}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

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
      <div class="comment-label mb-3">{{ kindLabel.toLowerCase() }} · {{ countEntries(pkg) }} entries</div>
      <div class="flex items-center gap-2.5 mb-2 flex-wrap">
        <h1 class="font-display text-3xl font-bold tracking-tight text-(--fg)">{{ pkg.name }}</h1>
        <DocsTag :label="`v${pkg.version}`" variant="neutral" />
      </div>
      <p class="text-(--fg-muted) text-[15px] leading-relaxed">{{ pkg.description }}</p>
      <div class="mt-5">
        <DocsCode :code="`pnpm add ${pkg.name}`" lang="bash" />
      </div>
    </header>

    <!-- API: filter + category chips + dense reference grid -->
    <template v-if="pkg.kind === 'api'">
      <div class="sticky top-14 z-20 -mx-2 px-2 py-3 backdrop-blur-md" style="background-color: var(--header-bg)">
        <div class="relative mb-2.5">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-(--accent-text) select-none">❯</span>
          <input
            v-model="query"
            type="text"
            :placeholder="`filter ${countEntries(pkg)} entries…`"
            class="w-full h-10 pl-8 pr-16 font-mono text-sm rounded-md bg-(--bg-elevated) border border-(--border) text-(--fg) placeholder:text-(--fg-subtle) focus:outline-none focus:border-(--accent) transition-colors"
          >
          <span v-if="query" class="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-(--fg-subtle) tabular-nums">
            {{ filteredCount }} hits
          </span>
        </div>

        <div class="flex gap-1.5 overflow-x-auto pb-1 -mb-1">
          <button
            v-for="category in filteredCategories"
            :key="category.slug"
            type="button"
            class="shrink-0 inline-flex items-center gap-1.5 h-6.5 px-2.5 font-mono text-[11px] rounded-full border border-(--border) bg-(--bg-elevated) text-(--fg-muted) hover:border-(--accent) hover:text-(--accent-text) transition-colors cursor-pointer"
            @click="scrollToCategory(category.slug)"
          >
            {{ category.name.toLowerCase() }}
            <span class="text-(--fg-subtle) tabular-nums">{{ category.items.length }}</span>
          </button>
        </div>
      </div>

      <div v-if="query && filteredCategories.length === 0" class="py-16 text-center">
        <div class="font-mono text-sm text-(--fg-subtle)">// no matches for "{{ query }}"</div>
      </div>

      <section
        v-for="category in filteredCategories"
        :id="`cat-${category.slug}`"
        :key="category.slug"
        class="mb-10 scroll-mt-40 pt-4"
      >
        <h2 class="comment-label mb-3">
          {{ category.name.toLowerCase() }} · {{ category.items.length }}
        </h2>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <NuxtLink
            v-for="item in category.items"
            :key="item.slug"
            :to="`/${pkg.slug}/${item.slug}`"
            class="group flex items-start gap-2.5 p-3 rounded-card border border-(--border) bg-(--bg-elevated) hover:border-(--border-strong) hover:shadow-(--shadow-card) transition-all"
          >
            <DocsBadge :kind="item.kind" size="sm" />
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-mono text-[13px] font-medium text-(--fg) group-hover:text-(--accent-text) transition-colors truncate">{{ item.name }}</span>
                <DocsTag v-if="item.hasDemo" label="demo" variant="demo" />
              </div>
              <p v-if="item.description" class="text-[12.5px] text-(--fg-subtle) mt-0.5 line-clamp-1">{{ item.description }}</p>
            </div>
          </NuxtLink>
        </div>
      </section>
    </template>

    <!-- Components: gallery -->
    <template v-else-if="pkg.kind === 'components'">
      <section>
        <h2 class="comment-label mb-4">
          all components · {{ pkg.components.length }}
        </h2>
        <div class="stagger grid grid-cols-1 gap-3 sm:grid-cols-2">
          <NuxtLink
            v-for="c in pkg.components"
            :key="c.slug"
            :to="`/${pkg.slug}/${c.slug}`"
            class="group block p-4 rounded-card border border-(--border) bg-(--bg-elevated) hover:border-(--border-strong) hover:shadow-(--shadow-card) transition-all"
          >
            <div class="flex items-center justify-between gap-2 mb-1.5">
              <span class="font-semibold text-(--fg) group-hover:text-(--accent-text) transition-colors">{{ c.name }}</span>
              <span class="font-mono text-[11px] text-(--fg-subtle) tabular-nums">{{ c.parts.length }} parts</span>
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
              <span v-if="c.parts.length > 4" class="text-[10px] font-mono text-(--fg-subtle) px-1">+{{ c.parts.length - 4 }}</span>
            </div>
          </NuxtLink>
        </div>
      </section>
    </template>

    <!-- Guide: overview markdown + section links -->
    <template v-else>
      <DocsMarkdown v-if="overview" :source="overview.markdown" />
      <section v-if="otherSections.length > 0" class="mt-10 pt-8 border-t border-(--border)">
        <h2 class="comment-label mb-4">sections</h2>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <NuxtLink
            v-for="s in otherSections"
            :key="s.slug"
            :to="`/${pkg.slug}/${s.slug}`"
            class="group flex items-center justify-between gap-3 p-3.5 rounded-card border border-(--border) bg-(--bg-elevated) hover:border-(--border-strong) hover:bg-(--bg-subtle) transition-all"
          >
            <span class="text-sm font-medium text-(--fg) group-hover:text-(--accent-text) transition-colors">{{ s.title }}</span>
            <span class="font-mono text-[11px] text-(--fg-subtle) group-hover:text-(--accent-text) transition-colors">❯</span>
          </NuxtLink>
        </div>
      </section>
    </template>
  </div>
</template>
