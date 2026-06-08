/**
 * Markdown renderers turning structured {@link DocsMetadata} into the text
 * payloads returned by the MCP tools/resources. Output targets an LLM reader:
 * compact, signature-first, code-fenced where it helps.
 */

import type {
  ComponentMeta,
  ComponentPartMeta,
  DocsMetadata,
  GuideSection,
  ItemMeta,
  MethodMeta,
  PackageMeta,
  ParamMeta,
  PropertyMeta,
} from '../extractor/types';
import type { DocEntry, SearchHit } from './docs-index';
import { countEntries, groupPackages } from './docs-index';

/** Collapse whitespace and trim — keeps table cells on one line. */
function inline(text: string): string {
  return text.replaceAll(/\s+/g, ' ').trim();
}

/** Escape pipe / newline so a value is safe inside a Markdown table cell. */
function cell(text: string): string {
  const value = inline(text).replaceAll('|', '\\|');
  return value.length > 0 ? value : '—';
}

/** A fenced code block; language defaults to `ts`. */
function fence(code: string, lang = 'ts'): string {
  return `\`\`\`${lang}\n${code.trim()}\n\`\`\``;
}

/** Maximum demo lines embedded verbatim before we truncate and link the source. */
const MAX_DEMO_LINES = 140;

/** A `## Demo` block, capped so a large demo.vue cannot bloat a single tool result. */
function demoBlock(source: string, sourcePath: string): string[] {
  const lines = source.trim().split('\n');
  if (lines.length <= MAX_DEMO_LINES) return ['## Demo', '', fence(source, 'vue'), ''];
  return [
    '## Demo',
    '',
    fence(lines.slice(0, MAX_DEMO_LINES).join('\n'), 'vue'),
    `_Demo truncated to ${MAX_DEMO_LINES} of ${lines.length} lines — full source: \`${sourcePath}\`._`,
    '',
  ];
}

/** Render a GitHub-flavoured Markdown table from a header + rows. */
function table(header: string[], rows: string[][]): string {
  const head = `| ${header.join(' | ')} |`;
  const divider = `| ${header.map(() => '---').join(' | ')} |`;
  const body = rows.map(r => `| ${r.join(' | ')} |`).join('\n');
  return [head, divider, body].join('\n');
}

/** A required/optional name with its default, formatted for a table cell. */
function paramName(p: ParamMeta | PropertyMeta): string {
  const base = p.optional ? `${p.name}?` : p.name;
  return p.defaultValue ? `${base} = ${p.defaultValue}` : base;
}

// ── Package list (table of contents) ─────────────────────────────────────────

export function renderPackageList(metadata: DocsMetadata): string {
  const lines: string[] = ['# @robonen/tools — documentation index', ''];

  for (const { label, packages } of groupPackages(metadata)) {
    lines.push(`## ${label}`, '');
    for (const pkg of packages) {
      const count = countEntries(pkg);
      const noun = pkg.kind === 'api' ? 'items' : pkg.kind === 'components' ? 'components' : 'sections';
      lines.push(
        `- **${pkg.slug}** — \`${pkg.name}\`@${pkg.version} · _${pkg.kind}_ · ${count} ${noun}${
          pkg.description ? `\n  ${inline(pkg.description)}` : ''}`,
      );
    }
    lines.push('');
  }

  lines.push(
    '---',
    `${metadata.packages.length} packages · generated ${metadata.generatedAt}`,
    'Use `get_package(slug)` for a package\'s contents, then `get_doc(package, name)` for full detail.',
  );

  return lines.join('\n');
}

// ── Package overview ─────────────────────────────────────────────────────────

export function renderPackageOverview(pkg: PackageMeta): string {
  const lines: string[] = [`# ${pkg.name}@${pkg.version}`, ''];
  if (pkg.description) lines.push(inline(pkg.description), '');
  lines.push(`_kind: ${pkg.kind} · group: ${pkg.group} · entry points: ${pkg.entryPoints.join(', ')}_`, '');

  if (pkg.kind === 'api') {
    for (const category of pkg.categories) {
      lines.push(`## ${category.name}`, '');
      for (const item of category.items) {
        lines.push(`- \`${item.name}\` · _${item.kind}_${item.description ? ` — ${inline(item.description)}` : ''}`);
      }
      lines.push('');
    }
  }
  else if (pkg.kind === 'components') {
    lines.push('## Components', '');
    for (const c of pkg.components) {
      const parts = c.parts.map(p => p.name).join(', ');
      lines.push(`- **${c.name}** (\`${c.slug}\`)${c.description ? ` — ${inline(c.description)}` : ''}`);
      if (parts) lines.push(`  parts: ${parts}`);
    }
    lines.push('');
  }
  else {
    lines.push('## Sections', '');
    for (const s of pkg.sections) lines.push(`- **${s.title}** (\`${s.slug}\`)`);
    lines.push('');
  }

  lines.push('---', `Use \`get_doc("${pkg.slug}", name)\` for the full documentation of an item.`);
  return lines.join('\n');
}

// ── Single entry ─────────────────────────────────────────────────────────────

function renderParams(params: ParamMeta[]): string[] {
  if (params.length === 0) return [];
  const rows = params.map(p => [cell(paramName(p)), cell(`\`${p.type}\``), cell(p.description)]);
  return ['## Parameters', '', table(['Parameter', 'Type', 'Description'], rows), ''];
}

function renderProperties(title: string, props: PropertyMeta[]): string[] {
  if (props.length === 0) return [];
  const rows = props.map(p => [
    cell(`${paramName(p)}${p.readonly ? ' _(readonly)_' : ''}`),
    cell(`\`${p.type}\``),
    cell(p.description),
  ]);
  return [`## ${title}`, '', table(['Name', 'Type', 'Description'], rows), ''];
}

function renderMethods(methods: MethodMeta[]): string[] {
  if (methods.length === 0) return [];
  const out: string[] = ['## Methods', ''];
  for (const m of methods) {
    out.push(`### ${m.name}${m.visibility && m.visibility !== 'public' ? ` _(${m.visibility})_` : ''}`);
    if (m.description) out.push('', inline(m.description));
    if (m.signatures.length > 0) out.push('', fence(m.signatures.join('\n')));
    out.push(...renderParams(m.params));
    if (m.returns) out.push(`**Returns** \`${inline(m.returns.type)}\`${m.returns.description ? ` — ${inline(m.returns.description)}` : ''}`, '');
  }
  return out;
}

function renderApiItem(pkg: PackageMeta, item: ItemMeta): string {
  const lines: string[] = [
    `# ${item.name}`,
    '',
    `_${item.kind} · ${pkg.name}${item.since ? ` · since ${item.since}` : ''} · \`${item.entryPoint}\`_`,
    '',
  ];
  if (item.description) lines.push(inline(item.description), '');

  if (item.signatures.length > 0) {
    lines.push('## Signature', '', fence(item.signatures.join('\n\n')), '');
  }

  if (item.typeParams.length > 0) {
    const rows = item.typeParams.map(tp => [
      cell(tp.name),
      cell(tp.constraint ? `\`${tp.constraint}\`` : '—'),
      cell(tp.default ? `\`${tp.default}\`` : '—'),
      cell(tp.description),
    ]);
    lines.push('## Type Parameters', '', table(['Name', 'Constraint', 'Default', 'Description'], rows), '');
  }

  lines.push(...renderParams(item.params));

  if (item.returns) {
    lines.push(
      '## Returns',
      '',
      `\`${inline(item.returns.type)}\`${item.returns.description ? ` — ${inline(item.returns.description)}` : ''}`,
      '',
    );
  }

  lines.push(...renderMethods(item.methods));
  lines.push(...renderProperties('Properties', item.properties));

  if (item.examples.length > 0) {
    lines.push('## Examples', '');
    for (const ex of item.examples) lines.push(fence(ex), '');
  }

  if (item.relatedTypes.length > 0) {
    lines.push('## Related Types', '');
    for (const t of item.relatedTypes) {
      lines.push(`### ${t.name}${t.description ? ` — ${inline(t.description)}` : ''}`);
      if (t.signatures.length > 0) lines.push('', fence(t.signatures.join('\n')));
      lines.push(...renderProperties('Properties', t.properties));
      lines.push('');
    }
  }

  if (item.hasDemo && item.demoSource) {
    lines.push(...demoBlock(item.demoSource, item.sourcePath));
  }

  lines.push('---', `Source: \`${item.sourcePath}\`${item.hasTests ? ' · has tests' : ''}`);
  return lines.join('\n');
}

function renderComponentPart(part: ComponentPartMeta): string[] {
  const out: string[] = [`### ${part.name}${part.role ? ` _(${part.role})_` : ''}`];
  if (part.description) out.push('', inline(part.description));
  out.push(...renderProperties('Props', part.props));

  if (part.emits.length > 0) {
    const rows = part.emits.map(e => [cell(e.name), cell(`\`${e.payload}\``), cell(e.description)]);
    out.push('#### Emits', '', table(['Event', 'Payload', 'Description'], rows), '');
  }
  return out;
}

function renderComponent(pkg: PackageMeta, component: ComponentMeta): string {
  const lines: string[] = [`# ${component.name}`, '', `_component · ${pkg.name} · \`${component.entryPoint}\`_`, ''];
  if (component.description) lines.push(inline(component.description), '');

  lines.push('## Anatomy', '');
  for (const part of component.parts) lines.push(...renderComponentPart(part));

  if (component.hasDemo && component.demoSource) {
    lines.push(...demoBlock(component.demoSource, component.sourcePath));
  }

  lines.push('---', `Source: \`${component.sourcePath}\``);
  return lines.join('\n');
}

function renderGuide(pkg: PackageMeta, section: GuideSection): string {
  return [`# ${section.title}`, '', `_guide · ${pkg.name}_`, '', section.markdown.trim()].join('\n');
}

/** Render any documented leaf to full Markdown. */
export function renderDocEntry(entry: DocEntry): string {
  if (entry.kind === 'api') return renderApiItem(entry.pkg, entry.item);
  if (entry.kind === 'components') return renderComponent(entry.pkg, entry.component);
  return renderGuide(entry.pkg, entry.section);
}

// ── Search results ───────────────────────────────────────────────────────────

export function renderSearchResults(hits: SearchHit[], query: string): string {
  if (hits.length === 0) {
    return `No documentation matches "${query}". Try a broader term, or call list_packages to browse.`;
  }

  const lines: string[] = [`Found ${hits.length} result${hits.length === 1 ? '' : 's'} for "${query}":`, ''];
  for (const hit of hits) {
    lines.push(
      `- **${hit.name}** · _${hit.badge}_ · \`${hit.packageSlug}/${hit.slug}\`${
        hit.description ? `\n  ${inline(hit.description)}` : ''}`,
    );
  }
  lines.push('', 'Call `get_doc(package, name)` with the `package/slug` above for full detail.');
  return lines.join('\n');
}
