/**
 * ts-morph based metadata extractor for @robonen/tools packages.
 *
 * Scans package source files, extracts JSDoc annotations and TypeScript signatures,
 * and produces a structured JSON metadata file consumed by the Nuxt docs site.
 */

import { resolve, relative, dirname } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { Project } from 'ts-morph';
import type { SourceFile, FunctionDeclaration, ClassDeclaration, InterfaceDeclaration, TypeAliasDeclaration, JSDoc, JSDocTag, MethodDeclaration, PropertyDeclaration, PropertySignature } from 'ts-morph';
import type {
  DocsMetadata,
  PackageMeta,
  CategoryMeta,
  ItemMeta,
  ParamMeta,
  ReturnMeta,
  TypeParamMeta,
  MethodMeta,
  PropertyMeta,
} from './types';

/** Repository root — docs/modules/extractor → three levels up */
const ROOT = resolve(import.meta.dirname, '..', '..', '..');

/** Packages to document — relative paths from repo root */
const PACKAGES: PackageConfig[] = [
  { path: 'core/stdlib', slug: 'stdlib' },
  { path: 'core/platform', slug: 'platform' },
  { path: 'vue/toolkit', slug: 'vue' },
  { path: 'configs/oxlint', slug: 'oxlint' },
];

interface PackageConfig {
  path: string;
  slug: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function slugify(name: string): string {
  return toKebabCase(name);
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
  // Try @description tag first
  const descTag = getTagValue(tags, 'description');
  if (descTag) return descTag;

  // Fall back to the main JSDoc comment text
  for (const doc of jsdocs) {
    const desc = doc.getDescription().trim();
    if (desc) return desc;
  }

  return '';
}

function getExamples(tags: JSDocTag[]): string[] {
  return tags
    .filter(t => t.getTagName() === 'example')
    .map((t) => {
      const text = t.getCommentText()?.trim() ?? '';
      // Strip surrounding ```ts ... ``` if present
      return text.replace(/^```(?:ts|typescript)?\n?/, '').replace(/\n?```$/, '').trim();
    })
    .filter(Boolean);
}

function extractParams(tags: JSDocTag[], node: FunctionDeclaration | MethodDeclaration): ParamMeta[] {
  const params: ParamMeta[] = [];
  const paramTags = tags.filter(t => t.getTagName() === 'param');

  for (const param of node.getParameters()) {
    const name = param.getName();
    const type = param.getType().getText(param);
    const optional = param.isOptional();
    const defaultValue = param.getInitializer()?.getText() ?? null;

    // Find matching @param tag
    const paramTag = paramTags.find((t) => {
      const tagText = t.getText();
      return tagText.includes(name);
    });

    let description = '';
    if (paramTag) {
      const comment = paramTag.getCommentText() ?? '';
      // Remove leading {type} annotation and param name
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
  const typeParams = node.getTypeParameters();
  return typeParams.map(tp => ({
    name: tp.getName(),
    constraint: tp.getConstraint()?.getText() ?? null,
    default: tp.getDefault()?.getText() ?? null,
    description: '',
  }));
}

function extractReturnMeta(tags: JSDocTag[], node: FunctionDeclaration | MethodDeclaration): ReturnMeta | null {
  const returnType = node.getReturnType().getText(node);
  if (returnType === 'void') return null;

  const returnsTag = getTagValue(tags, 'returns') || getTagValue(tags, 'return');
  const description = returnsTag.replace(/^\{[^}]*\}\s*/, '').trim();

  return { type: returnType, description };
}

function extractMethodMeta(method: MethodDeclaration): MethodMeta {
  const jsdocs = method.getJsDocs();
  const tags = getJsDocTags(jsdocs);
  const name = method.getName();

  // Simplified signature
  const signature = method.getText().split('{')[0]?.trim() ?? '';

  const visibility = method.getScope() ?? 'public';

  return {
    name,
    description: getDescription(jsdocs, tags),
    signatures: [signature],
    params: extractParams(tags, method),
    returns: extractReturnMeta(tags, method),
    visibility,
  };
}

function extractPropertyMeta(prop: PropertyDeclaration | PropertySignature): PropertyMeta {
  const jsdocs = prop.getJsDocs();
  const tags = getJsDocTags(jsdocs);

  return {
    name: prop.getName(),
    type: prop.getType().getText(prop),
    description: getDescription(jsdocs, tags),
    optional: prop.hasQuestionToken?.() ?? false,
    defaultValue: getTagValue(tags, 'default') || null,
    readonly: prop.isReadonly?.() ?? false,
  };
}

function getSourceDir(itemPath: string): string {
  // Get the directory containing the item's index.ts
  return dirname(itemPath);
}

function hasDemoFile(sourceFilePath: string): boolean {
  const dir = getSourceDir(sourceFilePath);
  return existsSync(resolve(dir, 'demo.vue'));
}

function readDemoSource(sourceFilePath: string): string {
  const dir = getSourceDir(sourceFilePath);
  const demoPath = resolve(dir, 'demo.vue');
  if (!existsSync(demoPath)) return '';
  return readFileSync(demoPath, 'utf-8');
}

function hasTestFile(sourceFilePath: string): boolean {
  const dir = getSourceDir(sourceFilePath);
  return existsSync(resolve(dir, 'index.test.ts'));
}

// ── Extraction ─────────────────────────────────────────────────────────────

function extractFunction(fn: FunctionDeclaration, sourceFilePath: string, entryPoint: string): ItemMeta | null {
  const name = fn.getName();
  if (!name) return null;

  // Skip private/internal functions
  if (name.startsWith('_')) return null;

  const jsdocs = fn.getJsDocs();
  const tags = getJsDocTags(jsdocs);
  const description = getDescription(jsdocs, tags);

  // Get signature text without body
  const signatureText = fn.getOverloads().length > 0
    ? fn.getOverloads().map(o => o.getText().trim())
    : [fn.getText().split('{')[0]?.trim() + '{ ... }'];

  return {
    name,
    slug: slugify(name),
    kind: 'function',
    description,
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

  // Also include get accessors as readonly properties
  const getters = cls.getGetAccessors()
    .filter(g => (g.getScope() ?? 'public') === 'public')
    .map(g => ({
      name: g.getName(),
      type: g.getReturnType().getText(g),
      description: getDescription(g.getJsDocs(), getJsDocTags(g.getJsDocs())),
      optional: false,
      defaultValue: null,
      readonly: true,
    }));

  // Build class signature
  const typeParams = cls.getTypeParameters();
  const typeParamStr = typeParams.length > 0
    ? `<${typeParams.map(tp => tp.getText()).join(', ')}>`
    : '';
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
  const typeParamStr = typeParams.length > 0
    ? `<${typeParams.map(tp => tp.getText()).join(', ')}>`
    : '';
  const extendsExprs = iface.getExtends();
  const extendsStr = extendsExprs.length > 0
    ? ` extends ${extendsExprs.map(e => e.getText()).join(', ')}`
    : '';
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

  const signature = typeAlias.getText().trim();

  return {
    name,
    slug: slugify(name),
    kind: 'type',
    description: getDescription(jsdocs, tags),
    since: getTagValue(tags, 'since'),
    signatures: [signature],
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

// ── Source Tree Walking ────────────────────────────────────────────────────

function collectExportedItems(
  sourceFile: SourceFile,
  entryPoint: string,
  visited: Set<string> = new Set(),
): ItemMeta[] {
  const filePath = sourceFile.getFilePath();
  if (visited.has(filePath)) return [];
  visited.add(filePath);

  const items: ItemMeta[] = [];

  // Direct exports from this file
  for (const fn of sourceFile.getFunctions()) {
    if (!fn.isExported()) continue;

    // Skip implementation signatures that have overloads
    const overloads = fn.getOverloads();
    if (overloads.length > 0) {
      // Use the first overload's doc for metadata, but collect all signatures
      const firstOverload = overloads[0]!;
      const jsdocs = firstOverload.getJsDocs();
      const tags = getJsDocTags(jsdocs);
      const name = fn.getName();
      if (!name || name.startsWith('_')) continue;

      const item: ItemMeta = {
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
      };
      items.push(item);
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
    // Skip internal interfaces (e.g. Options, Return types that are documented inline)
    const jsdocs = iface.getJsDocs();
    const tags = getJsDocTags(jsdocs);
    const hasCategory = getTagValue(tags, 'category') !== '';
    // Only include interfaces with @category or that have significant documentation
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

  // Follow barrel re-exports: export * from './...'
  for (const exportDecl of sourceFile.getExportDeclarations()) {
    const moduleSpecifier = exportDecl.getModuleSpecifierValue();
    if (!moduleSpecifier) continue;

    const referencedFile = exportDecl.getModuleSpecifierSourceFile();
    if (referencedFile) {
      items.push(...collectExportedItems(referencedFile, entryPoint, visited));
    }
  }

  return items;
}

// ── Co-located Type Grouping ───────────────────────────────────────────────

/**
 * Groups types/interfaces from `types.ts` files with their sibling
 * class/function items from the same directory.
 *
 * For example, Transition and TransitionConfig from StateMachine/types.ts
 * get attached as relatedTypes of StateMachine and AsyncStateMachine.
 */
function groupCoLocatedTypes(items: ItemMeta[]): ItemMeta[] {
  // Build a map: directory → items from types.ts
  const typesByDir = new Map<string, ItemMeta[]>();
  // Build a map: directory → primary items (classes, functions)
  const primaryByDir = new Map<string, ItemMeta[]>();

  for (const item of items) {
    const dir = dirname(item.sourcePath);
    const isTypesFile = item.sourcePath.endsWith('/types.ts');
    const isSecondary = isTypesFile && (item.kind === 'type' || item.kind === 'interface');

    if (isSecondary) {
      const existing = typesByDir.get(dir) ?? [];
      existing.push(item);
      typesByDir.set(dir, existing);
    }
    else {
      const existing = primaryByDir.get(dir) ?? [];
      existing.push(item);
      primaryByDir.set(dir, existing);
    }
  }

  // Attach co-located types to their primary items
  const absorbed = new Set<string>();
  for (const entry of Array.from(typesByDir.entries())) {
    const [dir, types] = entry;
    const primaries = primaryByDir.get(dir);
    if (!primaries || primaries.length === 0) continue;

    // Distribute types to all primary items in the same directory
    for (const primary of primaries) {
      primary.relatedTypes = [...types];
    }
    for (const t of types) {
      absorbed.add(`${t.entryPoint}:${t.name}`);
    }
  }

  // Return items without the absorbed types
  return items.filter(item => !absorbed.has(`${item.entryPoint}:${item.name}`));
}

// ── Package Extraction ─────────────────────────────────────────────────────

function extractPackage(config: PackageConfig): PackageMeta | null {
  const pkgDir = resolve(ROOT, config.path);
  const pkgJsonPath = resolve(pkgDir, 'package.json');

  if (!existsSync(pkgJsonPath)) {
    console.warn(`[extractor] package.json not found: ${pkgJsonPath}`);
    return null;
  }

  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
  const exports = pkgJson.exports ?? {};

  // Determine entry points
  const entryPoints: Array<{ subpath: string; filePath: string }> = [];

  for (const [subpath, value] of Object.entries(exports)) {
    if (typeof value === 'object' && value !== null) {
      const entry = (value as Record<string, string>).import ?? (value as Record<string, string>).types;
      if (entry) {
        // Map dist path back to source path
        // e.g. "./dist/index.js" → "src/index.ts" or "./dist/browsers.js" → "src/browsers/index.ts"
        const srcPath = entry
          .replace(/^\.\/dist\//, 'src/')
          .replace(/\.js$/, '.ts')
          .replace(/\.d\.ts$/, '.ts');

        const fullPath = resolve(pkgDir, srcPath);
        if (existsSync(fullPath)) {
          entryPoints.push({ subpath, filePath: fullPath });
        }
        else {
          // Try index.ts in subdirectory
          const altPath = resolve(pkgDir, srcPath.replace(/\.ts$/, '/index.ts'));
          if (existsSync(altPath)) {
            entryPoints.push({ subpath, filePath: altPath });
          }
          else {
            console.warn(`[extractor] Entry point not found: ${fullPath} or ${altPath}`);
          }
        }
      }
    }
  }

  if (entryPoints.length === 0) {
    console.warn(`[extractor] No entry points found for ${pkgJson.name}`);
    return null;
  }

  // Create ts-morph project for this package
  const tsconfigPath = resolve(pkgDir, 'tsconfig.json');
  const project = new Project({
    tsConfigFilePath: existsSync(tsconfigPath) ? tsconfigPath : undefined,
    skipAddingFilesFromTsConfig: true,
  });

  // Add entry files
  for (const ep of entryPoints) {
    project.addSourceFileAtPath(ep.filePath);
  }

  // Resolve all referenced files
  project.resolveSourceFileDependencies();

  // Extract items from all entry points
  const allItems: ItemMeta[] = [];
  for (const ep of entryPoints) {
    const sourceFile = project.getSourceFile(ep.filePath);
    if (!sourceFile) continue;
    const items = collectExportedItems(sourceFile, ep.subpath);
    allItems.push(...items);
  }

  // Deduplicate by name (overloaded functions may appear once already)
  const seen = new Set<string>();
  const uniqueItems = allItems.filter((item) => {
    const key = `${item.entryPoint}:${item.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Group co-located types with their parent class/function.
  // Types/interfaces from a types.ts file in the same directory as a
  // class or function become relatedTypes of that primary item.
  const groupedItems = groupCoLocatedTypes(uniqueItems);

  // Group by category
  const categoryMap = new Map<string, ItemMeta[]>();
  for (const item of groupedItems) {
    // Infer category from source path if not set
    const jsdocCategory = inferCategoryFromItem(item);
    const existing = categoryMap.get(jsdocCategory) ?? [];
    existing.push(item);
    categoryMap.set(jsdocCategory, existing);
  }

  const categories: CategoryMeta[] = Array.from(categoryMap.entries())
    .map(([name, items]) => ({
      name,
      slug: slugify(name),
      items: items.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    name: pkgJson.name,
    version: pkgJson.version,
    description: pkgJson.description ?? '',
    slug: config.slug,
    entryPoints: entryPoints.map(ep => ep.subpath),
    categories,
  };
}

function inferCategoryFromItem(item: ItemMeta): string {
  // Parse from source path
  const parts = item.sourcePath.split('/src/');
  if (parts.length < 2) return 'General';

  const segments = parts[1]!.split('/');

  // Patterns:
  // composables/browser/useIntervalFn/index.ts → "Browser"
  // arrays/cluster/index.ts → "Arrays"
  // patterns/behavioral/PubSub/index.ts → "Patterns"
  // types/js/primitives.ts → "Types"
  // structs/Stack/index.ts → "Data Structures" (use @category if available)

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

// ── Main ───────────────────────────────────────────────────────────────────

export function extract(): DocsMetadata {
  console.log('[extractor] Starting metadata extraction...');

  const packages: PackageMeta[] = [];

  for (const config of PACKAGES) {
    console.log(`[extractor] Processing ${config.path}...`);
    const pkg = extractPackage(config);
    if (pkg) {
      const itemCount = pkg.categories.reduce((sum, c) => sum + c.items.length, 0);
      console.log(`[extractor]   → ${pkg.name}@${pkg.version}: ${itemCount} items in ${pkg.categories.length} categories`);
      packages.push(pkg);
    }
  }

  const metadata: DocsMetadata = {
    packages,
    generatedAt: new Date().toISOString(),
  };

  const totalItems = packages.reduce(
    (sum, pkg) => sum + pkg.categories.reduce((s, c) => s + c.items.length, 0),
    0,
  );
  console.log(`[extractor] Done — ${totalItems} items across ${packages.length} packages`);

  return metadata;
}

// Allow running directly — prints metadata as JSON to stdout
if (import.meta.filename === process.argv[1]) {
  const metadata = extract();
  console.log(JSON.stringify(metadata, null, 2));
}
