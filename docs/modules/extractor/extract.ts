/**
 * ts-morph based metadata extractor for @robonen/tools packages.
 *
 * Each package declares a {@link PackageKind} so it can be documented in the way
 * that fits it best:
 *  - `api`        → scans source for exported functions / classes / types + JSDoc
 *  - `components` → walks `.vue` parts and extracts per-part props / emits (anatomy)
 *  - `guide`      → collects co-located Markdown files into prose sections
 *
 * Produces a single structured JSON metadata file consumed by the Nuxt docs site.
 */

import { basename, dirname, relative, resolve } from 'node:path';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { Node, Project, SyntaxKind } from 'ts-morph';
import type { ClassDeclaration, FunctionDeclaration, InterfaceDeclaration, JSDoc, JSDocTag, MethodDeclaration, PropertyDeclaration, PropertySignature, SourceFile, TypeAliasDeclaration, VariableDeclaration } from 'ts-morph';
import type {
  CategoryMeta,
  ComponentMeta,
  ComponentPartMeta,
  DocSection,
  DocsMetadata,
  EmitMeta,
  GuideSection,
  ItemMeta,
  MethodMeta,
  PackageGroup,
  PackageKind,
  PackageMeta,
  ParamMeta,
  PropertyMeta,
  ReturnMeta,
  TypeParamMeta,
} from './types';

/** Repository root — docs/modules/extractor → three levels up */
const ROOT = resolve(import.meta.dirname, '..', '..', '..');

/**
 * Statement-coverage percentage per source file (repo-relative path), parsed
 * from Istanbul's `coverage/coverage-final.json` if present. Empty when coverage
 * hasn't been generated — items then simply omit the coverage badge.
 */
function loadCoverage(): Map<string, number> {
  const map = new Map<string, number>();
  const file = resolve(ROOT, 'coverage', 'coverage-final.json');
  if (!existsSync(file)) return map;

  try {
    const data = JSON.parse(readFileSync(file, 'utf-8')) as Record<string, { s?: Record<string, number> }>;
    for (const [absPath, entry] of Object.entries(data)) {
      const counts = Object.values(entry.s ?? {});
      if (counts.length === 0) continue;
      const covered = counts.filter(c => c > 0).length;
      map.set(relative(ROOT, absPath), Math.round((covered / counts.length) * 100));
    }
  }
  catch {
    // Malformed/partial coverage file — skip rather than fail extraction.
  }

  return map;
}

const COVERAGE = loadCoverage();

interface PackageConfig {
  /** Path relative to repo root */
  path: string;
  /** URL slug */
  slug: string;
  /** Presentation kind */
  kind: PackageKind;
  /** Sidebar group */
  group: PackageGroup;
  /** For `guide` kind: markdown sources relative to the package dir.
   *  Supports exact files (`README.md`) and single-level globs (`rules/*.md`). */
  guideSources?: string[];
}

/** Packages to document. */
const PACKAGES: PackageConfig[] = [
  // ── core ──
  { path: 'core/stdlib', slug: 'stdlib', kind: 'api', group: 'core' },
  { path: 'core/platform', slug: 'platform', kind: 'api', group: 'core' },
  { path: 'core/fetch', slug: 'fetch', kind: 'api', group: 'core' },
  { path: 'core/encoding', slug: 'encoding', kind: 'api', group: 'core' },
  { path: 'core/crdt', slug: 'crdt', kind: 'api', group: 'core' },
  // ── vue ──
  { path: 'vue/toolkit', slug: 'vue', kind: 'api', group: 'vue' },
  { path: 'vue/editor', slug: 'editor', kind: 'api', group: 'vue' },
  { path: 'vue/primitives', slug: 'primitives', kind: 'components', group: 'vue' },
  // ── configs ──
  { path: 'configs/eslint', slug: 'eslint', kind: 'guide', group: 'configs', guideSources: ['README.md', 'rules/*.md'] },
  { path: 'configs/tsconfig', slug: 'tsconfig', kind: 'guide', group: 'configs', guideSources: ['README.md'] },
  { path: 'configs/tsdown', slug: 'tsdown', kind: 'guide', group: 'configs', guideSources: ['README.md'] },
  // ── infra ──
  { path: 'infra/renovate', slug: 'renovate', kind: 'guide', group: 'infra', guideSources: ['README.md'] },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function toKebabCase(str: string): string {
  return str
    .replaceAll(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replaceAll(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function slugify(name: string): string {
  return toKebabCase(name);
}

/**
 * Clean a type string for display: drop the `import("…").` qualifiers the type
 * checker emits when resolving types (e.g. `import("vue").Ref<T>` → `Ref<T>`) and
 * collapse whitespace. Prefer this over raw `.getType().getText()`.
 */
function cleanType(text: string): string {
  return text
    .replaceAll(/import\((?:"[^"]*"|'[^']*')\)\./g, '')
    .replaceAll(/\s+/g, ' ')
    .trim();
}

function toPascalCase(slug: string): string {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

function getJsDocTags(jsdocs: JSDoc[]): JSDocTag[] {
  return jsdocs.flatMap(doc => doc.getTags());
}

function getTagValue(tags: JSDocTag[], tagName: string): string {
  const tag = tags.find(t => t.getTagName() === tagName);
  if (!tag) return '';
  const comment = tag.getCommentText();
  return comment?.trim() ?? '';
}

function getDescription(jsdocs: JSDoc[], tags: JSDocTag[]): string {
  const descTag = getTagValue(tags, 'description');
  if (descTag) return descTag;

  for (const doc of jsdocs) {
    const desc = doc.getDescription().trim();
    if (desc) return desc;
  }

  return '';
}

/**
 * Example text straight from the tag SOURCE. `getCommentText()` runs through
 * the TS JSDoc parser, which strips each line's leading whitespace — code
 * indentation is gone. Instead take the raw tag text and remove only the
 * comment scaffolding (`@example` head, per-line ` * ` prefixes).
 */
function rawExampleText(tag: JSDocTag): string {
  return tag.getText()
    .replace(/^@example[ \t]?/, '')
    .split('\n')
    .map(line => line.replace(/^\s*\*(?: |\/\s*$)?/, ''))
    .join('\n')
    .replace(/\*\/?$/, '').trimEnd();
}

function getExamples(tags: JSDocTag[]): string[] {
  return tags
    .filter(t => t.getTagName() === 'example')
    .map((t) => {
      let text = rawExampleText(t).trim();
      // A leading `<caption>…</caption>` (JSDoc example title) isn't valid code —
      // turn it into a leading comment so the snippet stays clean & highlightable.
      let caption = '';
      const cap = text.match(/^<caption>([\s\S]*?)<\/caption>\s*/i);
      if (cap) {
        caption = cap[1]!.trim();
        text = text.slice(cap[0].length);
      }
      text = text.replace(/^```(?:ts|typescript|vue|js|javascript)?\n?/, '').replace(/\n?```$/, '').trim();
      return caption ? `// ${caption}\n${text}` : text;
    })
    .filter(Boolean);
}

function extractParams(tags: JSDocTag[], node: FunctionDeclaration | MethodDeclaration): ParamMeta[] {
  const params: ParamMeta[] = [];
  const paramTags = tags.filter(t => t.getTagName() === 'param');

  for (const param of node.getParameters()) {
    const name = param.getName();
    // Prefer the written annotation (`MaybeRefOrGetter<T>`) over the resolved
    // type, which expands aliases into noise (`T | import("vue").Ref<T> | …`).
    const type = cleanType(param.getTypeNode()?.getText() ?? param.getType().getText(param));
    const optional = param.isOptional();
    const defaultValue = param.getInitializer()?.getText() ?? null;

    const paramTag = paramTags.find(t => t.getText().includes(name));

    let description = '';
    if (paramTag) {
      const comment = paramTag.getCommentText() ?? '';
      description = comment
        .replace(/^\{[^}]*\}\s*/, '')
        .replace(new RegExp(`^${name}\\s*[-–—]?\\s*`), '')
        .replace(new RegExp(`^${name}\\s+`), '')
        .replace(/^[-–—]\s*/, '')
        .trim();
    }

    params.push({ name, type, description, optional, defaultValue });
  }

  return params;
}

function extractTypeParams(node: FunctionDeclaration | ClassDeclaration | InterfaceDeclaration | TypeAliasDeclaration): TypeParamMeta[] {
  return node.getTypeParameters().map(tp => ({
    name: tp.getName(),
    constraint: tp.getConstraint() ? cleanType(tp.getConstraint()!.getText()) : null,
    default: tp.getDefault() ? cleanType(tp.getDefault()!.getText()) : null,
    description: '',
  }));
}

/**
 * When a function returns a plain object — a named interface (`UseXReturn`) OR an
 * inline object literal (`{ first: HTMLElement | undefined; last: … }`) — expand
 * its properties so the renderer shows a Name/Type/Description table. Skips
 * unions/intersections, arrays/tuples, callable (function) types, primitives, and
 * built-ins (`Ref`/`ComputedRef`/`Promise`/`Map`… whose declaration is in
 * node_modules) — those keep just the type string.
 */
function extractReturnProperties(node: FunctionDeclaration | MethodDeclaration): PropertyMeta[] {
  const returnType = node.getReturnType();

  if (
    returnType.isUnion()
    || returnType.isIntersection()
    || returnType.isArray()
    || returnType.isTuple()
    || returnType.getCallSignatures().length > 0
    || !returnType.isObject()
  ) {
    return [];
  }

  // A named declaration in node_modules (Ref/Promise/Map…) is a built-in we don't
  // expand; anonymous object literals have no such declaration → keep going.
  const symbol = returnType.getAliasSymbol() ?? returnType.getSymbol();
  const decl = symbol?.getDeclarations()?.[0];
  if (decl && decl.getSourceFile().isInNodeModules())
    return [];

  const props: PropertyMeta[] = [];
  for (const prop of returnType.getProperties()) {
    const propDecl = prop.getDeclarations()?.[0];
    if (!propDecl || propDecl.getSourceFile().isInNodeModules())
      continue;

    // Prefer the written annotation (clean); fall back to the resolved type for
    // method-style members and inferred object-literal returns.
    const typeNode = Node.isTyped(propDecl) ? propDecl.getTypeNode() : undefined;
    const jsdocs = Node.isJSDocable(propDecl) ? propDecl.getJsDocs() : [];

    props.push({
      name: prop.getName(),
      type: cleanType(typeNode?.getText() ?? prop.getTypeAtLocation(node).getText(node)),
      description: getDescription(jsdocs, getJsDocTags(jsdocs)),
      optional: Node.isQuestionTokenable(propDecl) && propDecl.hasQuestionToken(),
      defaultValue: null,
      readonly: false,
    });
  }

  return props;
}

function extractReturnMeta(tags: JSDocTag[], node: FunctionDeclaration | MethodDeclaration): ReturnMeta | null {
  const returnType = cleanType(node.getReturnTypeNode()?.getText() ?? node.getReturnType().getText(node));
  if (returnType === 'void') return null;

  const returnsTag = getTagValue(tags, 'returns') || getTagValue(tags, 'return');
  const description = returnsTag.replace(/^\{[^}]*\}\s*/, '').trim();

  const properties = extractReturnProperties(node);

  return { type: returnType, description, properties };
}

function extractMethodMeta(method: MethodDeclaration): MethodMeta {
  const jsdocs = method.getJsDocs();
  const tags = getJsDocTags(jsdocs);

  return {
    name: method.getName(),
    description: getDescription(jsdocs, tags),
    signatures: [method.getText().split('{')[0]?.trim() ?? ''],
    params: extractParams(tags, method),
    returns: extractReturnMeta(tags, method),
    visibility: method.getScope() ?? 'public',
  };
}

function extractPropertyMeta(prop: PropertyDeclaration | PropertySignature): PropertyMeta {
  const jsdocs = prop.getJsDocs();
  const tags = getJsDocTags(jsdocs);

  return {
    name: prop.getName(),
    type: cleanType(prop.getTypeNode?.()?.getText() ?? prop.getType().getText(prop)),
    description: getDescription(jsdocs, tags),
    optional: prop.hasQuestionToken?.() ?? false,
    defaultValue: getTagValue(tags, 'default') || null,
    readonly: prop.isReadonly?.() ?? false,
  };
}

function getSourceDir(itemPath: string): string {
  return dirname(itemPath);
}

function hasDemoFile(sourceFilePath: string): boolean {
  return existsSync(resolve(getSourceDir(sourceFilePath), 'demo.vue'));
}

// Demo SOURCE is loaded lazily on the client (via `#docs/demo-sources`) only when
// "View source" is opened, so it is intentionally NOT embedded in the metadata
// payload (it was ~850KB). `hasDemo`/the lazy map carry what the UI needs.
function readDemoSource(_sourceFilePath: string): string {
  return '';
}

function hasTestFile(sourceFilePath: string): boolean {
  const dir = getSourceDir(sourceFilePath);
  return existsSync(resolve(dir, 'index.test.ts')) || existsSync(resolve(dir, '__test__'));
}

// ── API Extraction ───────────────────────────────────────────────────────────

function extractFunction(fn: FunctionDeclaration, sourceFilePath: string, entryPoint: string): ItemMeta | null {
  const name = fn.getName();
  if (!name || name.startsWith('_')) return null;

  const jsdocs = fn.getJsDocs();
  const tags = getJsDocTags(jsdocs);

  const signatureText = fn.getOverloads().length > 0
    ? fn.getOverloads().map(o => o.getText().trim())
    : [`${fn.getText().split('{')[0]?.trim()}{ ... }`];

  return {
    name,
    slug: slugify(name),
    kind: 'function',
    description: getDescription(jsdocs, tags),
    since: getTagValue(tags, 'since'),
    signatures: signatureText,
    params: extractParams(tags, fn),
    returns: extractReturnMeta(tags, fn),
    typeParams: extractTypeParams(fn),
    examples: getExamples(tags),
    methods: [],
    properties: [],
    hasDemo: hasDemoFile(sourceFilePath),
    demoSource: readDemoSource(sourceFilePath),
    hasTests: hasTestFile(sourceFilePath),
    relatedTypes: [],
    sourcePath: relative(ROOT, sourceFilePath),
    entryPoint,
  };
}

function extractClass(cls: ClassDeclaration, sourceFilePath: string, entryPoint: string): ItemMeta | null {
  const name = cls.getName();
  if (!name) return null;

  const jsdocs = cls.getJsDocs();
  const tags = getJsDocTags(jsdocs);

  const methods = cls.getMethods()
    .filter(m => (m.getScope() ?? 'public') === 'public')
    .filter(m => !m.getName().startsWith('_'))
    .map(extractMethodMeta);

  const properties = cls.getProperties()
    .filter(p => (p.getScope() ?? 'public') === 'public')
    .map(p => extractPropertyMeta(p));

  const getters = cls.getGetAccessors()
    .filter(g => (g.getScope() ?? 'public') === 'public')
    .map(g => ({
      name: g.getName(),
      type: cleanType(g.getReturnTypeNode()?.getText() ?? g.getReturnType().getText(g)),
      description: getDescription(g.getJsDocs(), getJsDocTags(g.getJsDocs())),
      optional: false,
      defaultValue: null,
      readonly: true,
    }));

  const typeParams = cls.getTypeParameters();
  const typeParamStr = typeParams.length > 0 ? `<${typeParams.map(tp => tp.getText()).join(', ')}>` : '';
  const extendsClause = cls.getExtends() ? ` extends ${cls.getExtends()!.getText()}` : '';
  const implementsClause = cls.getImplements().length > 0
    ? ` implements ${cls.getImplements().map(i => i.getText()).join(', ')}`
    : '';
  const signature = `class ${name}${typeParamStr}${extendsClause}${implementsClause}`;

  return {
    name,
    slug: slugify(name),
    kind: 'class',
    description: getDescription(jsdocs, tags),
    since: getTagValue(tags, 'since'),
    signatures: [signature],
    params: [],
    returns: null,
    typeParams: extractTypeParams(cls),
    examples: getExamples(tags),
    methods,
    properties: [...properties, ...getters],
    hasDemo: hasDemoFile(sourceFilePath),
    demoSource: readDemoSource(sourceFilePath),
    hasTests: hasTestFile(sourceFilePath),
    relatedTypes: [],
    sourcePath: relative(ROOT, sourceFilePath),
    entryPoint,
  };
}

function extractInterface(iface: InterfaceDeclaration, sourceFilePath: string, entryPoint: string): ItemMeta | null {
  const name = iface.getName();
  if (!name) return null;

  const jsdocs = iface.getJsDocs();
  const tags = getJsDocTags(jsdocs);

  const properties = iface.getProperties().map(p => extractPropertyMeta(p));

  const typeParams = iface.getTypeParameters();
  const typeParamStr = typeParams.length > 0 ? `<${typeParams.map(tp => tp.getText()).join(', ')}>` : '';
  const extendsExprs = iface.getExtends();
  const extendsStr = extendsExprs.length > 0 ? ` extends ${extendsExprs.map(e => e.getText()).join(', ')}` : '';
  const signature = `interface ${name}${typeParamStr}${extendsStr}`;

  return {
    name,
    slug: slugify(name),
    kind: 'interface',
    description: getDescription(jsdocs, tags),
    since: getTagValue(tags, 'since'),
    signatures: [signature],
    params: [],
    returns: null,
    typeParams: extractTypeParams(iface),
    examples: getExamples(tags),
    methods: [],
    properties,
    hasDemo: hasDemoFile(sourceFilePath),
    demoSource: readDemoSource(sourceFilePath),
    hasTests: hasTestFile(sourceFilePath),
    relatedTypes: [],
    sourcePath: relative(ROOT, sourceFilePath),
    entryPoint,
  };
}

function extractTypeAlias(typeAlias: TypeAliasDeclaration, sourceFilePath: string, entryPoint: string): ItemMeta | null {
  const name = typeAlias.getName();
  if (!name) return null;

  const jsdocs = typeAlias.getJsDocs();
  const tags = getJsDocTags(jsdocs);

  return {
    name,
    slug: slugify(name),
    kind: 'type',
    description: getDescription(jsdocs, tags),
    since: getTagValue(tags, 'since'),
    signatures: [typeAlias.getText().trim()],
    params: [],
    returns: null,
    typeParams: extractTypeParams(typeAlias),
    examples: getExamples(tags),
    methods: [],
    properties: [],
    hasDemo: hasDemoFile(sourceFilePath),
    demoSource: readDemoSource(sourceFilePath),
    hasTests: hasTestFile(sourceFilePath),
    relatedTypes: [],
    sourcePath: relative(ROOT, sourceFilePath),
    entryPoint,
  };
}

function extractVariable(
  decl: VariableDeclaration,
  jsdocs: JSDoc[],
  tags: JSDocTag[],
  sourceFilePath: string,
  entryPoint: string,
): ItemMeta | null {
  const name = decl.getName();
  if (!name || name.startsWith('_')) return null;

  const typeText = cleanType(decl.getTypeNode()?.getText() ?? decl.getType().getText(decl));
  const keyword = decl.getVariableStatement()?.getDeclarationKind() ?? 'const';
  // Show the declaration shape, not the (potentially huge) initializer value.
  const signature = `${keyword} ${name}: ${typeText}`;

  return {
    name,
    slug: slugify(name),
    kind: 'variable',
    description: getDescription(jsdocs, tags),
    since: getTagValue(tags, 'since'),
    signatures: [signature],
    params: [],
    returns: null,
    typeParams: [],
    examples: getExamples(tags),
    methods: [],
    properties: [],
    hasDemo: hasDemoFile(sourceFilePath),
    demoSource: readDemoSource(sourceFilePath),
    hasTests: hasTestFile(sourceFilePath),
    relatedTypes: [],
    sourcePath: relative(ROOT, sourceFilePath),
    entryPoint,
  };
}

function collectExportedItems(sourceFile: SourceFile, entryPoint: string, visited = new Set<string>()): ItemMeta[] {
  const filePath = sourceFile.getFilePath();
  if (visited.has(filePath)) return [];
  visited.add(filePath);

  const items: ItemMeta[] = [];

  for (const fn of sourceFile.getFunctions()) {
    if (!fn.isExported()) continue;

    const overloads = fn.getOverloads();
    if (overloads.length > 0) {
      const firstOverload = overloads[0]!;
      const jsdocs = firstOverload.getJsDocs();
      const tags = getJsDocTags(jsdocs);
      const name = fn.getName();
      if (!name || name.startsWith('_')) continue;

      items.push({
        name,
        slug: slugify(name),
        kind: 'function',
        description: getDescription(jsdocs, tags),
        since: getTagValue(tags, 'since'),
        signatures: overloads.map(o => o.getText().trim()),
        params: extractParams(tags, fn),
        returns: extractReturnMeta(tags, fn),
        typeParams: extractTypeParams(fn),
        examples: getExamples(tags),
        methods: [],
        properties: [],
        hasDemo: hasDemoFile(filePath),
        demoSource: readDemoSource(filePath),
        hasTests: hasTestFile(filePath),
        relatedTypes: [],
        sourcePath: relative(ROOT, filePath),
        entryPoint,
      });
    }
    else {
      const item = extractFunction(fn, filePath, entryPoint);
      if (item) items.push(item);
    }
  }

  for (const cls of sourceFile.getClasses()) {
    if (!cls.isExported()) continue;
    const item = extractClass(cls, filePath, entryPoint);
    if (item) items.push(item);
  }

  for (const iface of sourceFile.getInterfaces()) {
    if (!iface.isExported()) continue;
    const jsdocs = iface.getJsDocs();
    const tags = getJsDocTags(jsdocs);
    const hasCategory = getTagValue(tags, 'category') !== '';
    if (!hasCategory && jsdocs.length === 0) continue;
    const item = extractInterface(iface, filePath, entryPoint);
    if (item) items.push(item);
  }

  for (const typeAlias of sourceFile.getTypeAliases()) {
    if (!typeAlias.isExported()) continue;
    const jsdocs = typeAlias.getJsDocs();
    const tags = getJsDocTags(jsdocs);
    const hasCategory = getTagValue(tags, 'category') !== '';
    if (!hasCategory && jsdocs.length === 0) continue;
    const item = extractTypeAlias(typeAlias, filePath, entryPoint);
    if (item) items.push(item);
  }

  for (const varStatement of sourceFile.getVariableStatements()) {
    if (!varStatement.isExported()) continue;
    const jsdocs = varStatement.getJsDocs();
    const tags = getJsDocTags(jsdocs);
    // Gate (like types/interfaces): only documented consts, so we don't surface
    // every internal constant — desirable but not always.
    const hasCategory = getTagValue(tags, 'category') !== '';
    if (!hasCategory && jsdocs.length === 0) continue;

    for (const decl of varStatement.getDeclarations()) {
      const item = extractVariable(decl, jsdocs, tags, filePath, entryPoint);
      if (item) items.push(item);
    }
  }

  for (const exportDecl of sourceFile.getExportDeclarations()) {
    if (!exportDecl.getModuleSpecifierValue()) continue;
    const referencedFile = exportDecl.getModuleSpecifierSourceFile();
    if (referencedFile) items.push(...collectExportedItems(referencedFile, entryPoint, visited));
  }

  return items;
}

/**
 * Groups types/interfaces from `types.ts` files with their sibling
 * class/function items from the same directory as `relatedTypes`.
 */
/**
 * A trimmed copy of a type/interface for embedding as a primary's `relatedType`:
 * keeps the shape (signature/properties/description) but drops the heavy fields
 * (demo source, examples, nested types, params/returns) that would otherwise be
 * duplicated into the metadata payload.
 */
function slimRelatedType(type: ItemMeta): ItemMeta {
  return {
    ...type,
    examples: [],
    params: [],
    returns: null,
    methods: [],
    relatedTypes: [],
    hasDemo: false,
    demoSource: '',
  };
}

function groupCoLocatedTypes(items: ItemMeta[]): ItemMeta[] {
  const typesByDir = new Map<string, ItemMeta[]>();
  const primaryByDir = new Map<string, ItemMeta[]>();

  for (const item of items) {
    const dir = dirname(item.sourcePath);
    // Types/interfaces are documentation-secondary: when a function/class lives
    // in the same directory they fold into it as `relatedTypes` instead of
    // competing as standalone pages (keeps the reference to the important items).
    const isSecondary = item.kind === 'type' || item.kind === 'interface';

    const target = isSecondary ? typesByDir : primaryByDir;
    const existing = target.get(dir) ?? [];
    existing.push(item);
    target.set(dir, existing);
  }

  const absorbed = new Set<string>();
  for (const [dir, types] of Array.from(typesByDir.entries())) {
    const primaries = primaryByDir.get(dir);
    if (!primaries || primaries.length === 0) continue;

    for (const type of types) {
      // Attach each type to the SINGLE most-relevant primary (longest name-prefix
      // match, else the first) — never every primary — so it isn't duplicated N×,
      // and store a slim copy (no demo source / nested types).
      const typeName = type.name.toLowerCase();
      let owner = primaries[0]!;
      let bestLen = -1;
      for (const primary of primaries) {
        const primaryName = primary.name.toLowerCase();
        if (typeName.startsWith(primaryName) && primaryName.length > bestLen) {
          owner = primary;
          bestLen = primaryName.length;
        }
      }
      owner.relatedTypes.push(slimRelatedType(type));
      absorbed.add(`${type.entryPoint}:${type.name}`);
    }
  }

  return items.filter(item => !absorbed.has(`${item.entryPoint}:${item.name}`));
}

function inferCategoryFromItem(item: ItemMeta): string {
  const parts = item.sourcePath.split('/src/');
  if (parts.length < 2) return 'General';

  const segments = parts[1]!.split('/');

  if (segments[0] === 'composables' && segments.length >= 3) {
    const cat = segments[1]!;
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  }
  if (segments[0] && segments.length >= 2) {
    const cat = segments[0];
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  }
  return 'General';
}

/** Resolve a package's export subpaths to source entry files. */
function resolveEntryPoints(pkgDir: string, exportsField: Record<string, any>): Array<{ subpath: string; filePath: string }> {
  const entryPoints: Array<{ subpath: string; filePath: string }> = [];

  for (const [subpath, value] of Object.entries(exportsField)) {
    if (typeof value !== 'object' || value === null) continue;

    let entry: any = (value as Record<string, any>).import ?? (value as Record<string, any>).types;
    if (typeof entry === 'object' && entry !== null) entry = entry.types || entry.default;
    if (!entry || typeof entry !== 'string') continue;
    // Wildcard exports (e.g. "./*") can't be resolved to a single file here.
    if (entry.includes('*')) continue;

    const srcPath = entry
      .replace(/^\.\/dist\//, 'src/')
      .replace(/\.m?js$/, '.ts')
      .replace(/\.d\.m?ts$/, '.ts');

    const fullPath = resolve(pkgDir, srcPath);
    if (existsSync(fullPath)) {
      entryPoints.push({ subpath, filePath: fullPath });
    }
    else {
      const altPath = resolve(pkgDir, srcPath.replace(/\.ts$/, '/index.ts'));
      if (existsSync(altPath)) entryPoints.push({ subpath, filePath: altPath });
    }
  }

  // Fallback: a conventional src/index.ts entry.
  if (entryPoints.length === 0) {
    const idx = resolve(pkgDir, 'src/index.ts');
    if (existsSync(idx)) entryPoints.push({ subpath: '.', filePath: idx });
  }

  return entryPoints;
}

function buildApiCategories(pkgDir: string): CategoryMeta[] {
  const pkgJson = JSON.parse(readFileSync(resolve(pkgDir, 'package.json'), 'utf-8'));
  const entryPoints = resolveEntryPoints(pkgDir, pkgJson.exports ?? {});
  if (entryPoints.length === 0) return [];

  const tsconfigPath = resolve(pkgDir, 'tsconfig.json');
  const project = new Project({
    tsConfigFilePath: existsSync(tsconfigPath) ? tsconfigPath : undefined,
    skipAddingFilesFromTsConfig: true,
  });

  for (const ep of entryPoints) project.addSourceFileAtPath(ep.filePath);
  project.resolveSourceFileDependencies();

  const allItems: ItemMeta[] = [];
  for (const ep of entryPoints) {
    const sourceFile = project.getSourceFile(ep.filePath);
    if (!sourceFile) continue;
    allItems.push(...collectExportedItems(sourceFile, ep.subpath));
  }

  const seen = new Set<string>();
  const uniqueItems = allItems.filter((item) => {
    const key = `${item.entryPoint}:${item.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const groupedItems = groupCoLocatedTypes(uniqueItems);

  // Per-package slug uniqueness — the [package]/[utility] route keys on slug, so
  // a function `foo` and interface `Foo` (same kebab slug) would otherwise clash.
  // Functions/classes keep the base slug; lower-priority kinds get suffixed.
  const KIND_PRIORITY: Record<string, number> = { function: 0, class: 1, variable: 2, enum: 3, interface: 4, type: 5 };
  const usedSlugs = new Set<string>();
  for (const item of [...groupedItems].sort((a, b) => (KIND_PRIORITY[a.kind] ?? 9) - (KIND_PRIORITY[b.kind] ?? 9))) {
    if (!usedSlugs.has(item.slug)) {
      usedSlugs.add(item.slug);
      continue;
    }
    let candidate = `${item.slug}-${item.kind}`;
    let n = 2;
    while (usedSlugs.has(candidate))
      candidate = `${item.slug}-${item.kind}-${n++}`;
    item.slug = candidate;
    usedSlugs.add(candidate);
  }

  // Attach statement-coverage % (when coverage data exists) for the test badge.
  for (const item of groupedItems)
    item.coverage = COVERAGE.get(item.sourcePath) ?? null;

  const categoryMap = new Map<string, ItemMeta[]>();
  for (const item of groupedItems) {
    const cat = inferCategoryFromItem(item);
    const existing = categoryMap.get(cat) ?? [];
    existing.push(item);
    categoryMap.set(cat, existing);
  }

  return Array.from(categoryMap.entries())
    .map(([name, items]) => ({
      name,
      slug: slugify(name),
      items: items.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ── Component Extraction ───────────────────────────────────────────────────────

/** Pull a named `<script>` block's inner content out of an SFC string. */
function extractScriptBlock(sfc: string, setup: boolean): string {
  // Match <script ... lang="ts"> ... </script>; distinguish setup vs plain.
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(sfc)) !== null) {
    const attrs = match[1] ?? '';
    const isSetup = /\bsetup\b/.test(attrs);
    if (isSetup === setup) return match[2] ?? '';
  }
  return '';
}

/** Parse `defineEmits<{ 'a': [x: T]; b: [] }>()` from a setup block. */
function extractEmits(setupScript: string): EmitMeta[] {
  const m = setupScript.match(/defineEmits<\{([\s\S]*?)\}>\s*\(\s*\)/);
  if (!m) return [];
  const body = m[1] ?? '';
  const emits: EmitMeta[] = [];
  // Split on ; or newlines, then match `name: [payload]`
  for (const raw of body.split(/[;\n]/)) {
    const line = raw.trim();
    if (!line) continue;
    const em = line.match(/^['"]?([\w:-]+)['"]?\s*:\s*(\[[\s\S]*\])\s*$/);
    if (em) emits.push({ name: em[1]!, payload: em[2]!, description: '' });
  }
  return emits;
}

let partProjectCounter = 0;

/**
 * Parse `defineModel(...)` calls from a setup block into the v-model prop(s) +
 * their `update:*` emit(s) — these don't appear in the `XxxProps` interface or
 * `defineEmits`, so without this the controlled v-model API is invisible in docs.
 */
function extractModels(setupScript: string): { props: PropertyMeta[]; emits: EmitMeta[] } {
  const props: PropertyMeta[] = [];
  const emits: EmitMeta[] = [];
  if (!setupScript.includes('defineModel')) return { props, emits };

  const project = new Project({ useInMemoryFileSystem: true, skipAddingFilesFromTsConfig: true, compilerOptions: { allowJs: true, skipLibCheck: true } });
  const sf = project.createSourceFile(`__model_${partProjectCounter++}.ts`, setupScript);

  for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    if (call.getExpression().getText() !== 'defineModel') continue;

    const typeArg = call.getTypeArguments()[0];
    const type = typeArg ? cleanType(typeArg.getText()) : 'unknown';
    const firstArg = call.getArguments()[0];
    const name = firstArg && Node.isStringLiteral(firstArg) ? firstArg.getLiteralValue() : 'modelValue';

    props.push({
      name,
      type,
      description: name === 'modelValue'
        ? 'Two-way bound value (`v-model`).'
        : `Two-way bound value (\`v-model:${name}\`).`,
      optional: true,
      defaultValue: null,
      readonly: false,
    });
    emits.push({ name: `update:${name}`, payload: `[value: ${type}]`, description: '' });
  }

  return { props, emits };
}

/** Parse the `XxxProps` interface from a `.vue` part using ts-morph in-memory. */
function extractPartProps(plainScript: string): { props: PropertyMeta[]; description: string } {
  if (!plainScript.trim()) return { props: [], description: '' };

  // Strip imports — types they reference are unresolved here, which is fine:
  // getText() on property type nodes still yields the written type text.
  const project = new Project({ useInMemoryFileSystem: true, skipAddingFilesFromTsConfig: true, compilerOptions: { allowJs: true, skipLibCheck: true } });
  const sf = project.createSourceFile(`__part_${partProjectCounter++}.ts`, plainScript);

  const propsIface = sf.getInterfaces().find(i => i.getName().endsWith('Props'));
  if (!propsIface) return { props: [], description: '' };

  const jsdocs = propsIface.getJsDocs();
  const description = getDescription(jsdocs, getJsDocTags(jsdocs));

  const props = propsIface.getProperties().map((p) => {
    const pj = p.getJsDocs();
    const ptags = getJsDocTags(pj);
    return {
      name: p.getName(),
      // Use the written type text (declared), not the resolved type.
      type: p.getTypeNode()?.getText() ?? p.getType().getText(p),
      description: getDescription(pj, ptags),
      optional: p.hasQuestionToken(),
      defaultValue: getTagValue(ptags, 'default') || null,
      readonly: p.isReadonly(),
    } satisfies PropertyMeta;
  });

  return { props, description };
}

/** Read default-export component names from an index.ts barrel, in source order. */
function readPartOrder(indexPath: string): string[] {
  if (!existsSync(indexPath)) return [];
  const src = readFileSync(indexPath, 'utf-8');
  const order: string[] = [];
  const re = /export\s*\{\s*default\s+as\s+(\w+)\s*\}\s*from\s*['"]\.\/[\w.-]+\.vue['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) order.push(m[1]!);
  return order;
}

function roleFromName(componentName: string, base: string): string {
  // AccordionRoot + base "Accordion" → "Root"; AccordionItem → "Item"
  let role = componentName;
  if (componentName.startsWith(base)) role = componentName.slice(base.length);
  return role || 'Root';
}

function buildComponents(pkgDir: string): ComponentMeta[] {
  const srcDir = resolve(pkgDir, 'src');
  if (!existsSync(srcDir)) return [];

  const components: ComponentMeta[] = [];

  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = resolve(srcDir, entry.name);

    // A component group is any dir that ships at least one .vue file.
    const vueFiles = readdirSync(dir).filter(f => f.endsWith('.vue'));
    if (vueFiles.length === 0) continue;

    const slug = entry.name;
    const base = toPascalCase(slug);

    // Anatomy = the PUBLIC parts exported from index.ts, in declared order. This
    // excludes demo.vue and internal parts (*Impl, *Modal/NonModal, *Position, …)
    // that aren't part of the public API. Fall back to all .vue (minus demo) only
    // when the barrel exposes no parseable `export { default as X }`.
    const order = readPartOrder(resolve(dir, 'index.ts'));
    const publicFiles = order.map(name => `${name}.vue`).filter(f => vueFiles.includes(f));
    const candidates = publicFiles.length > 0
      ? publicFiles
      : vueFiles.filter(f => f !== 'demo.vue');
    // Drop internal implementation/variant parts users never compose directly
    // (the public part is e.g. `Content`, not `ContentImpl`/`ContentModal`).
    const INTERNAL_PART = /(?:Impl|ContentModal|ContentNonModal|RootContentModal|RootContentNonModal|Position)\.vue$/;
    const orderedFiles = candidates.filter(f => !INTERNAL_PART.test(f));

    const parts: ComponentPartMeta[] = [];
    let groupDescription = '';

    for (const file of orderedFiles) {
      const sfc = readFileSync(resolve(dir, file), 'utf-8');
      const plain = extractScriptBlock(sfc, false);
      const setup = extractScriptBlock(sfc, true);
      const { props, description } = extractPartProps(plain);
      const name = file.replace(/\.vue$/, '');
      const role = roleFromName(name, base);
      if (role === 'Root' && description && !groupDescription) groupDescription = description;

      // Merge in `defineModel` v-model props/emits (invisible to the interface/
      // defineEmits parsers), de-duping against any explicitly-declared ones.
      const models = extractModels(setup);
      const emits = extractEmits(setup);
      for (const mp of models.props)
        if (!props.some(p => p.name === mp.name)) props.push(mp);
      for (const me of models.emits)
        if (!emits.some(e => e.name === me.name)) emits.push(me);

      parts.push({ name, role, description, props, emits });
    }

    const entryPoint = `./${slug}`;
    const demoPath = resolve(dir, 'demo.vue');
    const hasDemo = existsSync(demoPath);

    components.push({
      name: base,
      slug,
      description: groupDescription,
      entryPoint,
      parts,
      hasDemo,
      demoSource: '', // loaded lazily client-side via #docs/demo-sources
      sourcePath: relative(ROOT, dir),
    });
  }

  return components.sort((a, b) => a.name.localeCompare(b.name));
}

// ── Guide Extraction ───────────────────────────────────────────────────────────

/** Resolve guide source patterns (exact files + single-level `dir/*.md`). */
function resolveGuideFiles(pkgDir: string, patterns: string[]): string[] {
  const files: string[] = [];
  for (const pattern of patterns) {
    if (pattern.includes('*')) {
      const dir = resolve(pkgDir, dirname(pattern));
      if (!existsSync(dir)) continue;
      const ext = pattern.slice(pattern.lastIndexOf('.'));
      const matched = readdirSync(dir)
        .filter(f => f.endsWith(ext) && f.toLowerCase() !== 'readme.md')
        .sort()
        .map(f => resolve(dir, f));
      files.push(...matched);
    }
    else {
      const full = resolve(pkgDir, pattern);
      if (existsSync(full)) files.push(full);
    }
  }
  return files;
}

function titleFromMarkdown(md: string, fallback: string): string {
  const m = md.match(/^\s*#\s+(\S.*)$/m);
  return m ? m[1]!.trim() : fallback;
}

function buildGuideSections(pkgDir: string, patterns: string[], pkgDescription: string): GuideSection[] {
  const files = resolveGuideFiles(pkgDir, patterns);
  const sections: GuideSection[] = [];

  for (const file of files) {
    const markdown = readFileSync(file, 'utf-8');
    const fileSlug = basename(file).replace(/\.md$/i, '');
    const slug = /readme/i.test(fileSlug) ? 'overview' : slugify(fileSlug);
    const fallbackTitle = slug === 'overview' ? 'Overview' : fileSlug;
    sections.push({ title: titleFromMarkdown(markdown, fallbackTitle), slug, markdown });
  }

  // Ensure an overview exists even when there's no README.
  if (!sections.some(s => s.slug === 'overview')) {
    sections.unshift({
      title: 'Overview',
      slug: 'overview',
      markdown: `# Overview\n\n${pkgDescription || 'Documentation for this package.'}\n`,
    });
  }
  else {
    // Move overview to the front.
    sections.sort((a, b) => (a.slug === 'overview' ? -1 : b.slug === 'overview' ? 1 : 0));
  }

  return sections;
}

// ── Hand-authored .vue doc sections ─────────────────────────────────────────────

/** Read an optional `<!-- key: value -->` directive from a doc SFC. */
function readDocDirective(src: string, key: string): string | undefined {
  const m = src.match(new RegExp(`<!--\\s*${key}\\s*:\\s*([^]*?)\\s*-->`));
  return m ? m[1]!.trim() : undefined;
}

function humanizeTitle(slug: string): string {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Discover hand-authored documentation pages from `<pkg>/docs/*.vue`.
 *  - `intro.vue` becomes the package landing (isIntro, sorted first).
 *  - Other files are ordered by a `<!-- order: N -->` directive or a numeric
 *    filename prefix (`02-concepts.vue`); titles come from `<!-- title: … -->`
 *    or the humanized filename.
 */
function buildDocSections(pkgDir: string): DocSection[] {
  const docsDir = resolve(pkgDir, 'docs');
  if (!existsSync(docsDir)) return [];

  const sections: DocSection[] = [];
  for (const file of readdirSync(docsDir)) {
    if (!file.endsWith('.vue')) continue;

    const full = resolve(docsDir, file);
    const src = readFileSync(full, 'utf-8');
    const base = file.replace(/\.vue$/, '');
    const isIntro = base === 'intro';

    // Optional numeric prefix on the filename, e.g. "02-concepts" or "02.concepts".
    const prefixed = base.match(/^(\d+)[-.](.+)$/);
    const rawName = prefixed ? prefixed[2]! : base;

    const orderDirective = readDocDirective(src, 'order');
    const order = isIntro
      ? -1
      : orderDirective !== undefined
        ? Number(orderDirective)
        : prefixed
          ? Number(prefixed[1])
          : 100;

    const slug = isIntro ? 'introduction' : slugify(rawName);
    const title = readDocDirective(src, 'title')
      ?? (isIntro ? 'Introduction' : humanizeTitle(rawName));

    sections.push({ title, slug, order, isIntro, sourcePath: relative(ROOT, full) });
  }

  return sections.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

// ── Package Extraction ─────────────────────────────────────────────────────────

function extractPackage(config: PackageConfig): PackageMeta | null {
  const pkgDir = resolve(ROOT, config.path);
  const pkgJsonPath = resolve(pkgDir, 'package.json');

  if (!existsSync(pkgJsonPath)) {
    console.warn(`[extractor] package.json not found: ${pkgJsonPath}`);
    return null;
  }

  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));

  const base: PackageMeta = {
    name: pkgJson.name,
    version: pkgJson.version,
    description: pkgJson.description ?? '',
    slug: config.slug,
    kind: config.kind,
    group: config.group,
    entryPoints: Object.keys(pkgJson.exports ?? { '.': {} }),
    categories: [],
    components: [],
    sections: [],
    docs: buildDocSections(pkgDir),
  };

  if (config.kind === 'api') {
    base.categories = buildApiCategories(pkgDir);
  }
  else if (config.kind === 'components') {
    base.components = buildComponents(pkgDir);
  }
  else if (config.kind === 'guide') {
    base.sections = buildGuideSections(pkgDir, config.guideSources ?? ['README.md'], base.description);
  }

  return base;
}

// ── Main ───────────────────────────────────────────────────────────────────

export function extract(): DocsMetadata {
  console.log('[extractor] Starting metadata extraction...');

  const packages: PackageMeta[] = [];

  for (const config of PACKAGES) {
    const pkg = extractPackage(config);
    if (!pkg) continue;

    let summary: string;
    if (pkg.kind === 'api') {
      const itemCount = pkg.categories.reduce((s, c) => s + c.items.length, 0);
      summary = `${itemCount} items / ${pkg.categories.length} categories`;
    }
    else if (pkg.kind === 'components') {
      const partCount = pkg.components.reduce((s, c) => s + c.parts.length, 0);
      summary = `${pkg.components.length} components / ${partCount} parts`;
    }
    else {
      summary = `${pkg.sections.length} sections`;
    }
    console.log(`[extractor]   → ${pkg.name}@${pkg.version} [${pkg.kind}]: ${summary}`);
    packages.push(pkg);
  }

  console.log(`[extractor] Done — ${packages.length} packages`);

  return { packages, generatedAt: new Date().toISOString() };
}

// Allow running directly — prints metadata as JSON to stdout
if (import.meta.filename === process.argv[1]) {
  console.log(JSON.stringify(extract(), null, 2));
}
