<script setup lang="ts">import { demos } from '#docs/demos';
import { sections } from '#docs/sections';

const route = useRoute();
const { resolveEntry } = useDocs();

const packageSlug = computed(() => route.params.package as string);
const utilitySlug = computed(() => route.params.utility as string);

const entry = computed(() => resolveEntry(packageSlug.value, utilitySlug.value));

if (!entry.value) {
  throw createError({
    statusCode: 404,
    message: `"${utilitySlug.value}" not found in package "${packageSlug.value}"`,
  });
}

const pkg = computed(() => entry.value!.pkg);

const demoComponent = computed(() => demos[`${packageSlug.value}/${utilitySlug.value}`] ?? null);
const sectionComponent = computed(() => sections[`${packageSlug.value}/${utilitySlug.value}`] ?? null);

// ── Doc sections: client-side TOC built from the rendered headings ───────────
const docRoot = ref<HTMLElement | null>(null);
const docToc = ref<Array<{ id: string; text: string; depth: number }>>([]);

function buildDocToc() {
  const el = docRoot.value;
  if (!el) return;
  docToc.value = Array.from(el.querySelectorAll('h2, h3')).map((h) => {
    if (!h.id) {
      h.id = (h.textContent ?? '')
        .toLowerCase().trim()
        .replaceAll(/[^a-z0-9]+/g, '-')
        .replaceAll(/(^-|-$)/g, '');
    }
    return { id: h.id, text: h.textContent ?? '', depth: h.tagName === 'H2' ? 2 : 3 };
  });
}

onMounted(() => {
  const el = docRoot.value;
  if (!el) return;
  buildDocToc();
  // The section is an async component — rebuild once its content mounts.
  const observer = new MutationObserver(() => buildDocToc());
  observer.observe(el, { childList: true, subtree: true });
  onScopeDispose(() => observer.disconnect());
});

function ghUrl(path: string) {
  return `https://github.com/robonen/tools/blob/master/${path}`;
}

// ── Page title & TOC ─────────────────────────────────────────────────────────
const title = computed(() => {
  const e = entry.value!;
  if (e.kind === 'api') return e.item.name;
  if (e.kind === 'components') return e.component.name;
  if (e.kind === 'doc') return e.section.title;
  return e.section.title;
});

useHead(() => ({
  title: `${title.value} — ${pkg.value.name}`,
  meta: [{
    name: 'description',
    content: entry.value?.kind === 'api' ? entry.value.item.description : pkg.value.description,
  }],
}));

const toc = computed(() => {
  const e = entry.value;
  if (!e) return [];

  if (e.kind === 'guide') {
    return extractHeadings(e.section.markdown).map(h => ({ id: h.id, text: h.text, depth: h.depth }));
  }
  if (e.kind === 'doc') {
    return docToc.value;
  }
  if (e.kind === 'components') {
    return e.component.parts.map(p => ({ id: p.name.toLowerCase(), text: p.name, depth: 2 }));
  }
  // api: derive from present sections
  const i = e.item;
  const items: Array<{ id: string; text: string; depth: number }> = [];
  if (i.examples.length) items.push({ id: 'example', text: 'Example', depth: 2 });
  if (i.hasDemo && demoComponent.value) items.push({ id: 'demo', text: 'Demo', depth: 2 });
  if (i.signatures.length) items.push({ id: 'signature', text: 'Signature', depth: 2 });
  if (i.typeParams.length) items.push({ id: 'type-parameters', text: 'Type Parameters', depth: 2 });
  if (i.params.length) items.push({ id: 'parameters', text: 'Parameters', depth: 2 });
  if (i.returns) items.push({ id: 'returns', text: 'Returns', depth: 2 });
  if (i.properties.length) items.push({ id: 'properties', text: 'Properties', depth: 2 });
  if (i.methods.length) items.push({ id: 'methods', text: 'Methods', depth: 2 });
  if (i.relatedTypes?.length) items.push({ id: 'related-types', text: 'Related Types', depth: 2 });
  return items;
});

const sectionTitle = 'text-xs font-semibold uppercase tracking-wider text-(--fg-subtle) mb-3';
</script>

<template>
  <div v-if="entry" class="xl:grid xl:grid-cols-[minmax(0,1fr)_14rem] xl:gap-12">
    <article class="min-w-0 max-w-3xl">
      <!-- Breadcrumb -->
      <nav class="flex items-center gap-1.5 text-sm text-(--fg-subtle) mb-6">
        <NuxtLink :to="`/${pkg.slug}`" class="hover:text-(--fg) transition-colors">{{ pkg.name }}</NuxtLink>
        <span>/</span>
        <span class="text-(--fg)">{{ title }}</span>
      </nav>

      <!-- ── API ITEM ───────────────────────────────────────────────────── -->
      <template v-if="entry.kind === 'api'">
        <header class="mb-8">
          <div class="flex items-center gap-2.5 mb-2 flex-wrap">
            <DocsBadge :kind="entry.item.kind" size="md" />
            <h1 class="min-w-0 break-words text-2xl font-bold font-mono tracking-tight text-(--fg)">{{ entry.item.name }}</h1>
            <DocsTag v-if="entry.item.since" :label="`v${entry.item.since}`" variant="neutral" />
            <DocsTag v-if="entry.item.hasTests" label="tested" variant="test" />
            <DocsTag v-if="entry.item.hasDemo" label="demo" variant="demo" />
          </div>
          <p v-if="entry.item.description" class="text-(--fg-muted) text-[15px] leading-relaxed">{{ entry.item.description }}</p>
          <div class="flex items-center gap-4 mt-4 text-sm">
            <a :href="ghUrl(entry.item.sourcePath)" target="_blank" rel="noopener noreferrer" class="flex items-center gap-1.5 text-(--fg-subtle) hover:text-(--fg) transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
              Source
            </a>
            <a v-if="entry.item.hasTests" :href="ghUrl(entry.item.sourcePath).replace('index.ts', 'index.test.ts')" target="_blank" rel="noopener noreferrer" class="flex items-center gap-1.5 text-(--fg-subtle) hover:text-(--fg) transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><path d="m9 15 2 2 4-4" /></svg>
              Tests
            </a>
          </div>
        </header>

        <section v-if="entry.item.examples.length" id="example" class="mb-8 scroll-mt-20">
          <h2 :class="sectionTitle">{{ entry.item.examples.length > 1 ? 'Examples' : 'Example' }}</h2>
          <div class="space-y-3">
            <DocsCode v-for="(ex, i) in entry.item.examples" :key="i" :code="ex" />
          </div>
        </section>

        <section v-if="entry.item.hasDemo && demoComponent" id="demo" class="mb-8 scroll-mt-20">
          <h2 :class="sectionTitle">Demo</h2>
          <DocsDemo :component="demoComponent" :source="entry.item.demoSource" />
        </section>

        <section v-if="entry.item.signatures.length" id="signature" class="mb-8 scroll-mt-20">
          <h2 :class="sectionTitle">{{ entry.item.signatures.length > 1 ? 'Signatures' : 'Signature' }}</h2>
          <div class="space-y-2">
            <DocsCode v-for="(sig, i) in entry.item.signatures" :key="i" :code="sig" />
          </div>
        </section>

        <section v-if="entry.item.typeParams.length" id="type-parameters" class="mb-8 scroll-mt-20">
          <h2 :class="sectionTitle">Type Parameters</h2>
          <div class="space-y-1.5">
            <div v-for="tp in entry.item.typeParams" :key="tp.name" class="flex items-baseline gap-2 text-sm flex-wrap">
              <code class="font-mono font-medium text-(--accent-text)">{{ tp.name }}</code>
              <span v-if="tp.constraint" class="text-(--fg-subtle)">extends <code class="font-mono text-xs">{{ tp.constraint }}</code></span>
              <span v-if="tp.default" class="text-(--fg-subtle)">= <code class="font-mono text-xs">{{ tp.default }}</code></span>
            </div>
          </div>
        </section>

        <section v-if="entry.item.params.length" id="parameters" class="mb-8 scroll-mt-20">
          <h2 :class="sectionTitle">Parameters</h2>
          <DocsParamsTable :params="entry.item.params" />
        </section>

        <section v-if="entry.item.returns" id="returns" class="mb-8 scroll-mt-20">
          <h2 :class="sectionTitle">Returns</h2>
          <div class="flex items-baseline gap-2 text-sm flex-wrap">
            <code class="font-mono bg-(--bg-inset) border border-(--border) px-2 py-1 rounded text-xs wrap-break-word">{{ entry.item.returns.type }}</code>
            <span v-if="entry.item.returns.description" class="text-(--fg-muted)">{{ entry.item.returns.description }}</span>
          </div>
        </section>

        <section v-if="entry.item.properties.length" id="properties" class="mb-8 scroll-mt-20">
          <h2 :class="sectionTitle">Properties</h2>
          <DocsPropsTable :properties="entry.item.properties" />
        </section>

        <section v-if="entry.item.methods.length" id="methods" class="mb-8 scroll-mt-20">
          <h2 :class="sectionTitle">Methods</h2>
          <DocsMethodsList :methods="entry.item.methods" />
        </section>

        <section v-if="entry.item.relatedTypes?.length" id="related-types" class="mb-8 scroll-mt-20">
          <h2 :class="sectionTitle">Related Types</h2>
          <div class="space-y-4">
            <div v-for="rt in entry.item.relatedTypes" :key="rt.name" class="rounded-xl border border-(--border) bg-(--bg-subtle) p-4">
              <div class="flex items-center gap-2 mb-2">
                <DocsBadge :kind="rt.kind" size="sm" />
                <h3 class="font-mono font-semibold text-sm text-(--fg)">{{ rt.name }}</h3>
              </div>
              <p v-if="rt.description" class="text-sm text-(--fg-muted) mb-3">{{ rt.description }}</p>
              <DocsCode v-if="rt.signatures.length" :code="rt.signatures[0]!" />
              <DocsPropsTable v-if="rt.properties.length" :properties="rt.properties" class="mt-3" />
            </div>
          </div>
        </section>
      </template>

      <!-- ── COMPONENT ──────────────────────────────────────────────────── -->
      <template v-else-if="entry.kind === 'components'">
        <header class="mb-8">
          <div class="flex items-center gap-2.5 mb-2 flex-wrap">
            <DocsBadge kind="component" size="md" />
            <h1 class="text-2xl font-bold tracking-tight text-(--fg)">{{ entry.component.name }}</h1>
            <DocsTag :label="`${entry.component.parts.length} parts`" variant="neutral" />
          </div>
          <p v-if="entry.component.description" class="text-(--fg-muted) text-[15px] leading-relaxed">{{ entry.component.description }}</p>
          <div class="flex items-center gap-4 mt-4 text-sm">
            <a :href="ghUrl(entry.component.sourcePath)" target="_blank" rel="noopener noreferrer" class="flex items-center gap-1.5 text-(--fg-subtle) hover:text-(--fg) transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
              Source
            </a>
          </div>
        </header>

        <section v-if="entry.component.hasDemo && demoComponent" class="mb-10">
          <h2 :class="sectionTitle">Demo</h2>
          <DocsDemo :component="demoComponent" :source="entry.component.demoSource" />
        </section>

        <DocsComponentAnatomy :component="entry.component" :package-name="pkg.name" />
      </template>

      <!-- ── GUIDE (Markdown) ───────────────────────────────────────────── -->
      <template v-else-if="entry.kind === 'guide'">
        <DocsMarkdown :source="entry.section.markdown" />
      </template>

      <!-- ── DOC SECTION (hand-authored .vue) ───────────────────────────── -->
      <template v-else-if="entry.kind === 'doc'">
        <div ref="docRoot" class="docs-section">
          <component :is="sectionComponent" />
        </div>
      </template>
    </article>

    <!-- Right rail TOC -->
    <aside class="hidden xl:block">
      <div class="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
        <DocsToc :items="toc" />
      </div>
    </aside>
  </div>
</template>
